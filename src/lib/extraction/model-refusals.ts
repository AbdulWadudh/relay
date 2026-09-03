import { and, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { modelCatalog } from "@/lib/db/schema"
import type { ChatProvider } from "@/lib/extraction/providers"
import { logger } from "@/lib/observability/logger"

/**
 * What a provider has REFUSED, remembered so the next run does not pay to
 * learn it again. Two kinds, and they are filtered at different points:
 *
 *  - paid       402 from a per-model billing provider. Applied in
 *               `catalogFor`, because the plan gates the model outright.
 *  - no-image   400 "does not support image input". Applied at RANK time
 *               and ONLY when the stage sends an image — the same model is
 *               often a perfectly good text model, so excluding it from
 *               extraction would be wrong.
 *
 * WHY THIS EXISTS. Ollama Cloud gates models by PLAN, publishes no pricing
 * in its catalog, and serves a handful free. Ranking is by advertised
 * capability, so measured 2026-09-04 against a live key its 19 eligible
 * models ranked:
 *
 *   1. mistral-large-3:675b   paid
 *   2. qwen3.5:397b           paid
 *   3. gpt-oss:120b           FREE
 *   4. gemma4:31b             FREE
 *   ... 8 more paid before the next free one
 *
 * `MAX_CANDIDATES` is 4, so every visit burned two 402s to reach a model
 * it could use, and two more big paid releases would have pushed the free
 * ones out of the window entirely — the provider would then fail despite
 * having six usable models.
 *
 * NO MODEL ID IS WRITTEN DOWN (human decision 2026-09-01). The provider
 * teaches us its own free set by refusing the rest, which also means a
 * plan upgrade or a pricing change needs no code edit — the record lives
 * beside the catalog snapshot and dies with it, so a rotated key or a
 * refreshed catalog re-learns from scratch.
 */

const PAID = "paid_models"
const NO_IMAGE = "no_image_models"

function stored(
  additionalData: Record<string, unknown> | null,
  key: string,
): string[] {
  const value = additionalData?.[key]
  if (!Array.isArray(value)) return []
  return value.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  )
}

/**
 * Applied as a VIEW over the cached snapshot rather than filtered on
 * write: the raw catalog is what the provider said, and what this user's
 * plan may reach is a separate fact that can change under it.
 */
export function withoutPaid<T extends { id: string }>(
  models: T[],
  paid: readonly string[],
): T[] {
  if (paid.length === 0) return models
  const blocked = new Set(paid)
  return models.filter((model) => !blocked.has(model.id))
}

export async function paidModelsFor(
  userId: string,
  provider: string,
): Promise<string[]> {
  const row = await getDb()
    .select({ additionalData: modelCatalog.additionalData })
    .from(modelCatalog)
    .where(
      and(eq(modelCatalog.userId, userId), eq(modelCatalog.provider, provider)),
    )
    .get()
  return stored(row?.additionalData ?? null, PAID)
}

/** Models that rejected an image, for a stage that needs one. */
export async function noImageModelsFor(
  userId: string,
  provider: string,
): Promise<string[]> {
  const row = await getDb()
    .select({ additionalData: modelCatalog.additionalData })
    .from(modelCatalog)
    .where(
      and(eq(modelCatalog.userId, userId), eq(modelCatalog.provider, provider)),
    )
    .get()
  return stored(row?.additionalData ?? null, NO_IMAGE)
}

/**
 * Safe to key off a 400 because the caller only asks when an image was
 * ACTUALLY sent and the provider's complaint mentions one. The other 400 a
 * chat call gets is about the response format — "'messages' must contain
 * the word 'json'" — which says nothing about images, so the two cannot be
 * confused.
 */
const REFUSED_IMAGE = /\bimages?\b/i

export function looksLikeImageRefusal(reason: string): boolean {
  return REFUSED_IMAGE.test(reason)
}

/**
 * Best-effort by design: failing to remember a 402 costs one wasted
 * request next time, never a run, so this never throws.
 */
export async function recordPaidModel(options: {
  userId: string
  provider: ChatProvider
  model: string
}): Promise<void> {
  const { provider } = options
  // Only meaningful where a 402 is about the MODEL. An account-wide 402
  // says nothing about which models the plan includes.
  if (provider.billing !== "per-model") return
  await remember({ ...options, key: PAID, what: "needs a paid plan" })
}

export async function recordNoImageModel(options: {
  userId: string
  provider: ChatProvider
  model: string
}): Promise<void> {
  await remember({ ...options, key: NO_IMAGE, what: "rejects images" })
}

async function remember(options: {
  userId: string
  provider: ChatProvider
  model: string
  key: string
  what: string
}): Promise<void> {
  const { userId, provider, model, key, what } = options

  try {
    const db = getDb()
    const row = await db
      .select({
        id: modelCatalog.id,
        additionalData: modelCatalog.additionalData,
      })
      .from(modelCatalog)
      .where(
        and(
          eq(modelCatalog.userId, userId),
          eq(modelCatalog.provider, provider.id),
        ),
      )
      .get()
    if (!row) return

    const known = stored(row.additionalData, key)
    if (known.includes(model)) return

    await db
      .update(modelCatalog)
      .set({
        additionalData: {
          ...(row.additionalData ?? {}),
          [key]: [...known, model],
        },
      })
      .where(eq(modelCatalog.id, row.id))
      .run()

    logger.info("Model refusal remembered", {
      provider: provider.id,
      model,
      refusal: what,
      known: known.length + 1,
    })
  } catch (error) {
    logger.warn("Could not remember a model refusal", {
      provider: provider.id,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

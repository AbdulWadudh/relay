import { and, eq } from "drizzle-orm"

import config from "@/config"
import { getDb } from "@/lib/db"
import { modelCatalog } from "@/lib/db/schema"
import { cacheKeys, get, invalidate, put } from "@/lib/extraction/cache"
import { paidModelsFor, withoutPaid } from "@/lib/extraction/model-refusals"
import { type CatalogModel, normaliseCatalog } from "@/lib/extraction/models"
import type { ChatProvider } from "@/lib/extraction/providers"
import { logger } from "@/lib/observability/logger"
import { providerCredentialStamp } from "@/lib/vault-select"

const TTL_MS = 24 * 60 * 60 * 1000
const CATALOG_VERSION = 4
const FETCH_TIMEOUT_MS = 15_000

interface CachedCatalog {
  models: CatalogModel[]
  fetchedAt: number
  stale: boolean
}

async function fetchModels(
  provider: ChatProvider,
  apiKey: string,
): Promise<CatalogModel[]> {
  const response = await fetch(`${provider.baseUrl}${provider.modelsPath}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`Model catalog request failed (${response.status})`)
  }
  const payload = (await response.json()) as { data?: unknown[] }
  return normaliseCatalog(payload.data ?? [], provider.capabilities)
}

async function readCache(
  userId: string,
  provider: string,
): Promise<typeof modelCatalog.$inferSelect | null> {
  const row = await getDb()
    .select()
    .from(modelCatalog)
    .where(
      and(eq(modelCatalog.userId, userId), eq(modelCatalog.provider, provider)),
    )
    .get()
  return row ?? null
}

async function writeCache(options: {
  userId: string
  provider: string
  models: CatalogModel[]
  credentialUpdatedAt: number
  existingId: string | null
}): Promise<void> {
  const db = getDb()
  const values = {
    models: options.models as unknown as Record<string, unknown>[],
    credentialUpdatedAt: options.credentialUpdatedAt,
    fetchedAt: Date.now(),
    additionalData: { version: CATALOG_VERSION },
  }

  if (options.existingId) {
    await db
      .update(modelCatalog)
      .set(values)
      .where(eq(modelCatalog.id, options.existingId))
      .run()
    return
  }

  await db
    .insert(modelCatalog)
    .values({
      id: crypto.randomUUID(),
      userId: options.userId,
      provider: options.provider,
      ...values,
    })
    .run()
}

/**
 * Every model this key can reach, refreshed if the snapshot has expired or
 * the credential moved underneath it. Ranking happens in models.ts — this
 * function is only responsible for freshness.
 */
/**
 * ONE place the plan filter is applied. `resolve` has four return points
 * — Redis, the row, a fresh fetch, a stale fallback — and filtering at
 * each of them is a hole waiting to be opened by the next edit.
 */
export async function catalogFor(options: {
  userId: string
  provider: ChatProvider
  apiKey: string
}): Promise<CachedCatalog> {
  const catalog = await resolve(options)
  const paid = await paidModelsFor(options.userId, options.provider.id)
  return { ...catalog, models: withoutPaid(catalog.models, paid) }
}

async function resolve(options: {
  userId: string
  provider: ChatProvider
  apiKey: string
}): Promise<CachedCatalog> {
  const { userId, provider, apiKey } = options
  // Shared by every key the provider holds, so walking the fallback chain
  // does not invalidate the snapshot (src/lib/vault-select.ts).
  const stamp = await providerCredentialStamp(provider.id, userId)

  // Redis first. The snapshot is keyed to the credential stamp, so a
  // rotated key misses rather than serving the previous key's catalog.
  const hot = await get<{ models: CatalogModel[]; stamp: number }>(
    cacheKeys.catalog(userId, provider.id),
  )
  if (hot && hot.stamp === stamp) {
    return { models: hot.models, fetchedAt: Date.now(), stale: false }
  }

  const cachedRow = await readCache(userId, provider.id)

  const expired = !cachedRow || Date.now() - cachedRow.fetchedAt > TTL_MS
  const rotated = cachedRow !== null && cachedRow.credentialUpdatedAt !== stamp
  const outdated =
    cachedRow !== null && cachedRow.additionalData?.version !== CATALOG_VERSION
  if (cachedRow && !expired && !rotated && !outdated) {
    const models = cachedRow.models as unknown as CatalogModel[]
    await warm(userId, provider.id, models, stamp)
    return { models, fetchedAt: cachedRow.fetchedAt, stale: false }
  }

  try {
    const models = await fetchModels(provider, apiKey)
    await writeCache({
      userId,
      provider: provider.id,
      models,
      credentialUpdatedAt: stamp,
      existingId: cachedRow?.id ?? null,
    })
    await warm(userId, provider.id, models, stamp)
    logger.info("Model catalog refreshed", {
      provider: provider.id,
      model_count: models.length,
      reason: rotated
        ? "credential_rotated"
        : outdated
          ? "normaliser_changed"
          : "expired",
    })
    return { models, fetchedAt: Date.now(), stale: false }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (cachedRow) {
      // A stale catalog still routes a run; no catalog fails it outright.
      logger.warn("Model catalog refresh failed — serving stale snapshot", {
        provider: provider.id,
        age_ms: Date.now() - cachedRow.fetchedAt,
        error: message,
      })
      return {
        models: cachedRow.models as unknown as CatalogModel[],
        fetchedAt: cachedRow.fetchedAt,
        stale: true,
      }
    }
    logger.error("Model catalog unavailable", {
      provider: provider.id,
      error: message,
    })
    return { models: [], fetchedAt: 0, stale: true }
  }
}

/**
 * Pushes a snapshot into Redis. Written through `cached` so there is one
 * serialisation format and one key builder rather than two.
 */
async function warm(
  userId: string,
  provider: string,
  models: CatalogModel[],
  stamp: number,
): Promise<void> {
  await put(
    cacheKeys.catalog(userId, provider),
    { models, stamp },
    config.cache.catalogTtlSeconds,
  )
}

/** Drops a provider's snapshot from BOTH layers so the next run refetches. */
export async function invalidateCatalog(
  userId: string,
  provider: string,
): Promise<void> {
  await invalidate(cacheKeys.catalog(userId, provider))
  await getDb()
    .delete(modelCatalog)
    .where(
      and(eq(modelCatalog.userId, userId), eq(modelCatalog.provider, provider)),
    )
    .run()
}

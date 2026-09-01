import { and, eq } from "drizzle-orm"

import config from "@/config"
import { getDb } from "@/lib/db"
import { credentials, modelCatalog } from "@/lib/db/schema"
import { cacheKeys, get, invalidate, put } from "@/lib/extraction/cache"
import { type CatalogModel, normaliseCatalog } from "@/lib/extraction/models"
import type { ChatProvider } from "@/lib/extraction/providers"
import { logger } from "@/lib/observability/logger"

/**
 * The DB-backed model catalog cache (Task 4.4, human decision 2026-09-01).
 *
 * Refreshed when EITHER trigger fires:
 *  - the snapshot is older than the TTL (OpenRouter's free pool turns over
 *    daily, so a day is the useful ceiling), or
 *  - the credential has been modified since the snapshot was taken.
 *    Rotating a key can change what it reaches, so the cached answer is no
 *    longer about the same key.
 *
 * The cache lives in the database rather than in memory because the web
 * process and the worker are separate processes, and the worker restarts
 * on every deploy — an in-process Map would refetch constantly and share
 * nothing.
 *
 * A refresh that fails does NOT fail the run: a stale catalog is far more
 * useful than none, so the last good snapshot is served and the failure is
 * logged.
 */

const TTL_MS = 24 * 60 * 60 * 1000

/**
 * Bump whenever `CatalogModel` gains a field the ranker reads. A snapshot
 * written by an older normaliser is missing that field, and ranking on a
 * silently-absent value is worse than refetching.
 */
// 4: provider-level capability fallbacks are now folded in at normalise
// time (ChatProvider.capabilities), so a v3 snapshot of a provider that
// advertises nothing — Ollama — has zeroed capabilities the ranker would
// reject. Those snapshots must be refetched, not reused.
const CATALOG_VERSION = 4

/** Never let a provider outage stall the pipeline on a network read. */
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

/** The credential's own `updated_at`, which is the key-rotation signal. */
async function credentialStamp(
  userId: string,
  provider: string,
): Promise<number> {
  const row = await getDb()
    .select({ updatedAt: credentials.updatedAt })
    .from(credentials)
    .where(
      and(eq(credentials.userId, userId), eq(credentials.provider, provider)),
    )
    .get()
  return row?.updatedAt ?? 0
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
export async function catalogFor(options: {
  userId: string
  provider: ChatProvider
  apiKey: string
}): Promise<CachedCatalog> {
  const { userId, provider, apiKey } = options
  const stamp = await credentialStamp(userId, provider.id)

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

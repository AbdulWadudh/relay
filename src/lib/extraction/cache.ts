import IORedis from "ioredis"

import config from "@/config"
import { logger } from "@/lib/observability/logger"

/**
 * Redis/Dragonfly read-through cache for pipeline prompts and provider
 * model catalogs (human decision 2026-09-01).
 *
 * The DATABASE is the source of truth, so every failure here degrades to a
 * cache miss: an unreachable Dragonfly costs a query, never a failed run.
 * Invalidation is explicit on write; the TTLs in src/config are a backstop
 * for what this module cannot see (another process, a hand-edited row).
 *
 * Uses its OWN connection rather than the queue's. BullMQ's is tuned for
 * queue semantics — `enableOfflineQueue: false`, so a command issued
 * before the handshake completes throws rather than silently buffering an
 * enqueue that never lands. For a cache that trade is backwards: the very
 * first read in a fresh process would always fail ("Stream isn't writeable
 * and enableOfflineQueue options is false", measured), and a cache write
 * that lands a few milliseconds late is harmless.
 */

const globalForCache = globalThis as unknown as { __relayCacheRedis?: IORedis }

function client(): IORedis {
  globalForCache.__relayCacheRedis ??= (() => {
    const redis = new IORedis(config.queue.url, {
      // Buffer through the handshake — see above.
      enableOfflineQueue: true,
      // Fail fast to the database instead of retrying; the DB is the
      // source of truth and is right there.
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
    })
    // Without a listener, ioredis promotes connection errors to unhandled
    // exceptions and takes the worker down over a cache outage.
    redis.on("error", (error) => {
      logger.warn("Cache connection error", { error: error.message })
    })
    return redis
  })()
  return globalForCache.__relayCacheRedis
}

function keyFor(parts: string[]): string {
  return [config.cache.prefix, ...parts].join(":")
}

/** Cache reads never throw — a miss and an outage are the same outcome. */
async function readThrough(key: string): Promise<string | null> {
  try {
    return await client().get(key)
  } catch (error) {
    logger.warn("Cache read failed — falling back to the database", {
      key,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

async function write(key: string, value: string, ttl: number): Promise<void> {
  try {
    await client().set(key, value, "EX", ttl)
  } catch (error) {
    logger.warn("Cache write failed", {
      key,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/** A cached value, or null on a miss, an outage, or a corrupt entry. */
export async function get<T>(parts: string[]): Promise<T | null> {
  const hit = await readThrough(keyFor(parts))
  if (hit === null) return null
  try {
    return JSON.parse(hit) as T
  } catch {
    // A corrupt entry is worth exactly one wasted read.
    await invalidate(parts)
    return null
  }
}

/**
 * Unconditional write. Distinct from `cached` on purpose: refreshing an
 * entry that is present but WRONG (a rotated key's catalog) must overwrite
 * it, and a read-through helper returns the stale hit instead.
 */
export async function put(
  parts: string[],
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  await write(keyFor(parts), JSON.stringify(value), ttlSeconds)
}

/**
 * Serves `parts` from the cache, else loads it and caches the result.
 * `null` from `load` is NOT cached — a missing row is usually a row that
 * is about to be seeded, and caching its absence would hide it for a TTL.
 */
export async function cached<T>(options: {
  parts: string[]
  ttlSeconds: number
  load: () => Promise<T | null>
}): Promise<T | null> {
  const hit = await get<T>(options.parts)
  if (hit !== null) return hit

  const value = await options.load()
  if (value === null) return null
  await put(options.parts, value, options.ttlSeconds)
  return value
}

/** Drops a key so the next read reloads it from the database. */
export async function invalidate(parts: string[]): Promise<void> {
  const key = keyFor(parts)
  try {
    await client().del(key)
  } catch (error) {
    // The TTL still bounds how long the stale entry can survive.
    logger.warn("Cache invalidation failed — entry expires on its TTL", {
      key,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export const cacheKeys = {
  prompt: (userId: string, key: string) => ["prompt", userId, key],
  catalog: (userId: string, provider: string) => ["catalog", userId, provider],
}

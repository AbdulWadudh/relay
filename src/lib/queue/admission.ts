import config from "@/config"
import { logger } from "@/lib/observability/logger"
import { createRedis } from "@/lib/queue/connection"
import { getCredentialIdByType } from "@/lib/vault-secrets"

/**
 * Whether a run may START right now (SESSION_AUTH.md §5.3, §5.4).
 *
 * Two independent gates, checked in this order:
 *
 *  1. **Per-user slot.** BullMQ OSS has no job groups and its `limiter` is
 *     global rather than per-key, so fairness has to live outside the
 *     queue. This is also a correctness gate: two runs sharing one cookie
 *     jar both write the rotated jar back on exit and the loser clobbers a
 *     live session.
 *  2. **Per-credential rate budget**, only when the run will actually use
 *     a stored session. An anonymous download touches nobody's account, so
 *     it is not metered.
 *
 * Neither gate ever FAILS a run. Over budget is a "later", not a "never",
 * so the caller delays the job and `relay_runs` keeps the row at `queued`.
 */

export type Admission =
  | { ok: true; release: () => Promise<void> }
  | {
      ok: false
      retryAt: number
      /**
       * `jar_busy` is distinct from `user_busy` on purpose: at
       * `perUserConcurrency` 1 they are indistinguishable, but the moment
       * that knob is raised they are different problems, and an operator
       * reading the log should not have to guess which lock bit.
       */
      reason: "user_busy" | "jar_busy" | "rate_budget"
    }

/**
 * Its own connection, like the Worker's: a Worker holds blocking commands
 * open on its socket, and an admission check must never queue behind one.
 */
const globalForAdmission = globalThis as unknown as {
  __relayAdmissionRedis?: ReturnType<typeof createRedis>
}

function redis() {
  // Offline queueing ON: these commands run at job pickup, which can be the
  // first thing a freshly started worker does. ioredis connects lazily, so
  // with `enableOfflineQueue: false` that first command throws before the
  // socket is ready — the same trap capture tickets hit.
  globalForAdmission.__relayAdmissionRedis ??= createRedis({
    enableOfflineQueue: true,
  })
  return globalForAdmission.__relayAdmissionRedis
}

/**
 * Hash-tagged like the BullMQ prefix. Dragonfly runs with
 * `--cluster_mode=emulated --lock_on_hashtags` (docker-compose.yml), so
 * keys that must be reasoned about together belong in one tag.
 */
function slotKey(userId: string, index: number): string {
  return `{relay:user:${userId}}:slot:${index}`
}

/**
 * The jar-clobber lock, and it is deliberately SEPARATE from the fairness
 * slot above. Two runs sharing one cookie jar both write the rotated jar
 * back on exit and the loser can invalidate a live session — that hazard
 * belongs to the CREDENTIAL, not to the user, so it is enforced on the
 * credential and holds no matter what `perUserConcurrency` is set to.
 * SESSION_AUTH.md §5.4 notes the coupling; this makes it structural rather
 * than a comment someone has to remember.
 */
function credentialLockKey(credentialId: string): string {
  return `{relay:cred:${credentialId}}:lock`
}

function budgetKey(credentialId: string, window: "h" | "d"): string {
  return `{relay:cred:${credentialId}}:${window}`
}

/**
 * Releases the slot ONLY if we still hold it. A plain DEL would let a run
 * whose slot had already expired (crash-safety TTL) delete the slot a
 * different run has since acquired, silently defeating the whole gate.
 */
const RELEASE_IF_OWNED = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`

/**
 * `PX` is the crash-safety net, not a runtime budget: a worker killed
 * mid-run releases by expiry rather than wedging that user forever.
 */
async function acquire(
  key: string,
  runId: string,
): Promise<(() => Promise<void>) | null> {
  const acquired = await redis().set(
    key,
    runId,
    "PX",
    config.queue.userSlotTtlMs,
    "NX",
  )
  if (acquired !== "OK") return null

  return async () => {
    try {
      await redis().eval(RELEASE_IF_OWNED, 1, key, runId)
    } catch (error) {
      // The TTL is the backstop, so a failed release costs a delay, never
      // a stuck queue. Not worth failing a run that already finished.
      logger.warn("Could not release admission lock", {
        run_id: runId,
        key,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

/** First free slot of `perUserConcurrency`, so the knob means what it says. */
async function acquireUserSlot(
  userId: string,
  runId: string,
): Promise<(() => Promise<void>) | null> {
  for (let index = 0; index < config.queue.perUserConcurrency; index++) {
    const release = await acquire(slotKey(userId, index), runId)
    if (release) return release
  }
  return null
}

/**
 * Exact rolling window rather than a fixed bucket: a fixed hourly bucket
 * lets a user spend the whole budget at :59 and the whole next one at :00,
 * which is precisely the burst shape that gets an account flagged. A ZSET
 * of request timestamps also makes the answer to "when does room appear?"
 * exact — it is the moment the oldest entry ages out.
 */
async function checkWindow(
  credentialId: string,
  window: "h" | "d",
  limit: number,
  windowMs: number,
  now: number,
): Promise<number | null> {
  const key = budgetKey(credentialId, window)
  const client = redis()
  await client.zremrangebyscore(key, 0, now - windowMs)
  const used = await client.zcard(key)
  if (used < limit) return null

  const [, oldest] = await client.zrange(key, "0", "0", "WITHSCORES")
  // If the entry vanished between the count and this read, the window has
  // already moved — try again promptly rather than inventing a long delay.
  return oldest ? Number(oldest) + windowMs : now + config.queue.deferMs
}

async function chargeBudget(
  credentialId: string,
  runId: string,
  now: number,
): Promise<number | null> {
  const { ratePerHour, ratePerDay } = config.social
  const hour = 3_600_000
  const day = 24 * hour

  // BOTH windows are checked before EITHER is charged. Charging as we go
  // would spend an hourly token on a run the daily cap then rejects.
  const blockedUntil =
    (await checkWindow(credentialId, "h", ratePerHour, hour, now)) ??
    (await checkWindow(credentialId, "d", ratePerDay, day, now))
  if (blockedUntil !== null) return blockedUntil

  const client = redis()
  for (const [window, ms] of [
    ["h", hour],
    ["d", day],
  ] as const) {
    const key = budgetKey(credentialId, window)
    await client.zadd(key, String(now), runId)
    // Bounded even if a window is never read again.
    await client.pexpire(key, ms)
  }
  return null
}

export async function admitRun(run: {
  id: string
  userId: string
  source: string
}): Promise<Admission> {
  const now = Date.now()
  const soon = now + config.queue.deferMs

  const releaseSlot = await acquireUserSlot(run.userId, run.id)
  if (!releaseSlot) {
    return { ok: false, retryAt: soon, reason: "user_busy" }
  }

  // A social credential's `provider` IS the media source id
  // (SESSION_AUTH.md §2.4), so no mapping table is needed. No credential
  // means the download is anonymous: it touches nobody's account, so it is
  // neither metered nor serialized on a jar.
  const credentialId = await getCredentialIdByType(
    run.source,
    run.userId,
    "cookie",
  )
  if (!credentialId) return { ok: true, release: releaseSlot }

  const releaseJar = await acquire(credentialLockKey(credentialId), run.id)
  if (!releaseJar) {
    // Every lock taken so far is handed straight back before deferring —
    // this run is not going to execute, and holding anything would block
    // the user's other runs for nothing.
    await releaseSlot()
    return { ok: false, retryAt: soon, reason: "jar_busy" }
  }

  const release = async () => {
    await releaseJar()
    await releaseSlot()
  }

  const blockedUntil = await chargeBudget(credentialId, run.id, now)
  if (blockedUntil === null) return { ok: true, release }

  await release()
  logger.info("Run delayed by the per-credential rate budget", {
    run_id: run.id,
    credential_id: credentialId,
    retry_at: blockedUntil,
  })
  return { ok: false, retryAt: blockedUntil, reason: "rate_budget" }
}

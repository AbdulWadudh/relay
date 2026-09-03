import config from "@/config"

/**
 * The live log stream for one run, kept in Dragonfly.
 *
 * WHY DRAGONFLY AND NOT THE DATABASE. The worker writes these lines and
 * the web process reads them, so an in-process buffer cannot work. A
 * column on `relay_runs` would mean a migration plus a per-write cost on a
 * remote Turso database for data whose whole value is being fresh. A capped
 * list with a TTL is the shape of the thing: cheap appends, bounded
 * memory, and it disappears on its own.
 *
 * Older runs are served from OpenObserve instead — see
 * `src/lib/observability/run-logs-history.ts`. Live is fast and complete;
 * history is durable. Neither needed new storage.
 *
 * NOTHING HERE MAY THROW. It sits on the logging path, so a Redis blip
 * must degrade to "no live logs in the UI", never to a failed run.
 */

export interface RunLogLine {
  /**
   * Stable identity for one line, assigned at WRITE time.
   *
   * Exists because a log line has no natural id and two lines can share a
   * millisecond, which leaves the UI keying a list on an array index. Only
   * one process ever writes a given run's logs (the worker that owns the
   * job), so a timestamp plus a process-local counter is genuinely unique
   * per run rather than merely probably unique.
   */
  id: string
  /** Epoch ms. */
  at: number
  level: string
  /** Pipeline stage (a `RunStatus`), or "" when logged outside a stage. */
  stage: string
  message: string
  /**
   * The log's remaining structured fields, redacted by `redactLogValue`
   * inside `RunLogStream` before they ever reach this module. Kept so the
   * UI can show the detail an operator needs (which client was tried,
   * which error) without a second round trip.
   *
   * A sensitive field therefore arrives as the literal "[REDACTED]",
   * which is deliberate: it tells the operator a value was withheld
   * rather than silently omitting the key.
   */
  fields?: Record<string, unknown>
}

/**
 * Hash-tagged on the run id, matching the queue's convention for
 * Dragonfly running `--cluster_mode=emulated --lock_on_hashtags`: one
 * run's key lands in one slot, so the LPUSH and the EXPIRE below are a
 * single-slot pair rather than a cross-slot operation.
 */
function key(runId: string): string {
  return `relay:runlogs:{${runId}}`
}

/**
 * A DEDICATED client, not the queue's: log writes must buffer while the
 * socket comes up, where an enqueue must fail loudly. See
 * `getRunLogRedis`.
 *
 * Imported lazily, and that is load-bearing rather than lazy-for-its-own-
 * sake. `src/lib/queue/connection.ts` imports the logger, and the logger
 * imports this module, so a static import here would close the cycle
 * logger -> run-logs -> connection -> logger. Resolving the client inside
 * the call keeps the module graph acyclic.
 */
async function redis() {
  const { getRunLogRedis } = await import("@/lib/queue/connection")
  return getRunLogRedis()
}

/**
 * Appends one line, trims to the cap and refreshes the TTL.
 *
 * The trim keeps the NEWEST lines: a run that fails after thousands of
 * lines is diagnosed from its end, not its beginning, and an unbounded
 * list on a machine that also holds the job queue is a memory leak with a
 * deadline.
 */
export function appendRunLog(runId: string, line: RunLogLine): void {
  const { maxLines, ttlSeconds } = config.observability.runLogs
  void (async () => {
    try {
      const client = await redis()
      const target = key(runId)
      await client
        .multi()
        .lpush(target, JSON.stringify(line))
        .ltrim(target, 0, maxLines - 1)
        .expire(target, ttlSeconds)
        .exec()
    } catch {
      // Deliberately silent. Reporting this through `logger` would recurse
      // straight back into the stream that called us.
    }
  })()
}

/**
 * Oldest-first, which is how a log stream reads. Redis holds them
 * newest-first because appends are LPUSH (O(1) at the head).
 */
export async function readRunLogs(runId: string): Promise<RunLogLine[]> {
  try {
    const client = await redis()
    const raw = await client.lrange(key(runId), 0, -1)
    return raw
      .map((entry) => {
        try {
          return JSON.parse(entry) as RunLogLine
        } catch {
          return null
        }
      })
      .filter((line): line is RunLogLine => line !== null)
      .reverse()
  } catch {
    return []
  }
}

/** Lets a deleted run take its logs with it instead of waiting out the TTL. */
export function dropRunLogs(runId: string): void {
  void (async () => {
    try {
      await (await redis()).del(key(runId))
    } catch {
      // Same reason as `appendRunLog`: never surface this.
    }
  })()
}

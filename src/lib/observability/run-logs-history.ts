import config from "@/config"

import type { RunLogLine } from "@/lib/observability/run-logs"

/**
 * The log stream for a run whose live window has expired — read back out
 * of OpenObserve.
 *
 * WHY THIS EXISTS. `run-logs.ts` keeps a capped list with a TTL, so a run
 * from last week has nothing live. Every line was already shipped to
 * OpenObserve by the logger's own stream, so history costs no new storage
 * — only a query. That is the whole reason the split is worth having:
 * live reads are instant and complete, historical reads are durable, and
 * neither required a migration.
 *
 * DEGRADES TO EMPTY, NEVER THROWS. If OpenObserve is unreachable or not
 * configured, the caller shows "no logs retained" rather than an error —
 * absent logs must not make a run look broken.
 */

interface SearchHit {
  _timestamp?: number
  level?: string | number
  stage?: string
  msg?: string
  message?: string
  [key: string]: unknown
}

/**
 * pino writes numeric levels; the UI wants names. Mapped here rather than
 * in the component because it is a property of the log SOURCE.
 */
const LEVEL_NAME: Record<number, string> = {
  10: "trace",
  20: "debug",
  30: "info",
  40: "warn",
  50: "error",
  60: "fatal",
}

function levelName(level: string | number | undefined): string {
  if (typeof level === "number") return LEVEL_NAME[level] ?? String(level)
  return level ?? "info"
}

/**
 * Fields that are transport noise rather than diagnostics, dropped so the
 * UI shows the same shape it gets from the live path.
 */
const DROPPED = new Set([
  "_timestamp",
  "level",
  "stage",
  "msg",
  "message",
  "time",
  "run_id",
  "service",
  "hostname",
  "pid",
  "stream",
])

/**
 * Run ids are generated, so anything that is not the generated shape is a
 * caller bug or an injection attempt — either way it must not reach the
 * query.
 *
 * This is a guard, not an escape. OpenObserve's `_search` API takes a SQL
 * string with no parameter binding, so the id IS interpolated; validating
 * the shape first is what makes that safe. Do not relax this to allow
 * quotes or whitespace.
 */
const RUN_ID = /^[A-Za-z0-9_-]{1,64}$/

/**
 * `run_id` is matched in SQL rather than by scanning, so the work happens
 * in OpenObserve. Bounded by `maxLines` because a pathological run must
 * not return a million rows into a request handler.
 *
 * The time range is deliberately wide and now-relative: the caller knows
 * the run exists but not when its logs were written, and a narrow window
 * keyed off `created_at` would miss a run that was retried long after it
 * was created.
 */
export async function readRunLogsHistory(runId: string): Promise<RunLogLine[]> {
  const { url, org, token, streams, runLogs } = config.observability
  if (!url || !token) return []
  if (!RUN_ID.test(runId)) return []

  const base = url.replace(/\/$/, "")
  // OpenObserve timestamps are MICROseconds.
  const now = Date.now() * 1000
  const from = now - runLogs.historyDays * 86_400 * 1_000_000

  try {
    const response = await fetch(`${base}/api/${org}/_search`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: {
          sql: `SELECT * FROM "${streams.server}" WHERE run_id = '${runId}' ORDER BY _timestamp ASC`,
          start_time: from,
          end_time: now,
          from: 0,
          size: runLogs.maxLines,
        },
      }),
    })
    if (!response.ok) return []

    const body = (await response.json()) as { hits?: SearchHit[] }
    return (body.hits ?? []).map((hit, index) => {
      const fields = Object.fromEntries(
        Object.entries(hit).filter(
          ([name]) => !DROPPED.has(name) && !name.startsWith("_"),
        ),
      )
      return {
        // Derived from the ORDERED query rather than carried through the
        // log record: `id` is assigned by the live writer and is not a
        // field OpenObserve stores. Stable for a given result set, which
        // is all a finished run needs -- its logs cannot change.
        id: `${hit._timestamp ?? 0}-${index}`,
        // OpenObserve stores microseconds.
        at: Math.round((hit._timestamp ?? 0) / 1000),
        level: levelName(hit.level),
        stage: typeof hit.stage === "string" ? hit.stage : "",
        message: hit.msg ?? hit.message ?? "",
        ...(Object.keys(fields).length > 0 ? { fields } : {}),
      }
    })
  } catch {
    return []
  }
}

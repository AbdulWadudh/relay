/**
 * The time window every analytics panel is scoped to, plus the two
 * statistics the dashboard reports.
 *
 * PLAIN DATA and dependency-free — no Drizzle, no React — so the Zod
 * schema, the Hono module, and the client range picker all derive their
 * vocabulary from `ANALYTICS_RANGES` rather than restating it (RULES.md:
 * no hardcoding).
 */

export const ANALYTICS_RANGES = [
  { id: "7d", label: "Last 7 days", short: "7d", days: 7 },
  { id: "30d", label: "Last 30 days", short: "30d", days: 30 },
  { id: "90d", label: "Last 90 days", short: "90d", days: 90 },
  { id: "all", label: "All time", short: "All", days: null },
] as const

export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number]["id"]

export const ANALYTICS_RANGE_IDS = ANALYTICS_RANGES.map((r) => r.id) as [
  AnalyticsRange,
  ...AnalyticsRange[],
]

export const DEFAULT_RANGE: AnalyticsRange = "all"

const DAY_MS = 86_400_000

export interface Window {
  /** Null for "all time" — the query then has no lower bound. */
  from: number | null
  to: number
  /** The equally-long window immediately before `from`, for deltas. */
  previousFrom: number | null
  days: number | null
}

export function analyticsWindow(
  range: AnalyticsRange,
  now = Date.now(),
): Window {
  const days = ANALYTICS_RANGES.find((r) => r.id === range)?.days ?? null
  if (days === null) {
    return { from: null, to: now, previousFrom: null, days: null }
  }
  const from = now - days * DAY_MS
  return { from, to: now, previousFrom: from - days * DAY_MS, days }
}

/** UTC day bucket. Deliberately not local time: the server buckets, and a
 *  reader in another timezone must not see a different set of days than
 *  the one the numbers were computed against. */
export function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Every day from `from` to `to` inclusive, so a day with no runs renders
 * as a gap in the axis rather than being skipped and silently compressing
 * the timeline.
 */
export function dayKeys(from: number, to: number): string[] {
  const keys: string[] = []
  const start = Date.UTC(
    new Date(from).getUTCFullYear(),
    new Date(from).getUTCMonth(),
    new Date(from).getUTCDate(),
  )
  for (let at = start; at <= to; at += DAY_MS) keys.push(dayKey(at))
  return keys
}

/**
 * Nearest-rank percentile over an ASCENDING array. Returns null for an
 * empty set rather than 0 — "no runs recorded this" and "it took no time"
 * are different answers and a chart must not conflate them.
 */
export function percentile(ascending: number[], p: number): number | null {
  if (ascending.length === 0) return null
  const rank = Math.ceil((p / 100) * ascending.length)
  return ascending[Math.min(Math.max(rank, 1), ascending.length) - 1]
}

export function median(ascending: number[]): number | null {
  return percentile(ascending, 50)
}

/** Sorts a copy — callers pass raw collections and must not be mutated. */
export function ascending(values: number[]): number[] {
  return [...values].sort((a, b) => a - b)
}

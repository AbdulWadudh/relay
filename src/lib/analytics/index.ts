import { eq } from "drizzle-orm"

import { type Breakdowns, buildBreakdowns } from "@/lib/analytics/breakdowns"
import {
  buildConnectedApps,
  type ConnectedApp,
} from "@/lib/analytics/credentials"
import { buildEvidence, type Evidence } from "@/lib/analytics/evidence"
import { fetchRunFacts } from "@/lib/analytics/facts"
import { buildFailures, type FailureAnatomy } from "@/lib/analytics/failures"
import { buildLatency, type Latency } from "@/lib/analytics/latency"
import { buildModels, type Models } from "@/lib/analytics/models"
import {
  buildKpis,
  type Kpis,
  type StatusCount,
  statusCounts,
} from "@/lib/analytics/overview"
import { type AnalyticsRange, analyticsWindow } from "@/lib/analytics/window"
import { getDb } from "@/lib/db"
import { agents } from "@/lib/db/schema"

/**
 * The dashboard's single payload (`GET /api/v1/analytics/summary`).
 *
 * One shape, one request: every panel is scoped to the same window, so
 * splitting this into a call per panel would let the numbers on one card
 * disagree with the card beside it while requests landed out of order.
 */

export interface AnalyticsSummary {
  range: AnalyticsRange
  from: number | null
  to: number
  kpis: Kpis
  statuses: StatusCount[]
  failures: FailureAnatomy
  latency: Latency
  models: Models
  breakdowns: Breakdowns
  evidence: Evidence
  apps: ConnectedApp[]
}

async function agentNames(userId: string): Promise<Map<string, string>> {
  const rows = await getDb()
    .select({ id: agents.id, name: agents.name })
    .from(agents)
    .where(eq(agents.userId, userId))
    .all()
  return new Map(rows.map((row) => [row.id, row.name]))
}

export async function getAnalytics(
  userId: string,
  range: AnalyticsRange,
  now = Date.now(),
): Promise<AnalyticsSummary> {
  const window = analyticsWindow(range, now)

  const [facts, previous, names] = await Promise.all([
    fetchRunFacts(userId, window.from, window.to),
    // Only for the success-rate delta, and only when there is a previous
    // window to compare against — "all time" has none.
    window.from !== null && window.previousFrom !== null
      ? fetchRunFacts(userId, window.previousFrom, window.from)
      : Promise.resolve([]),
    agentNames(userId),
  ])

  return {
    range,
    from: window.from,
    to: window.to,
    kpis: buildKpis(facts, previous, window),
    statuses: statusCounts(facts),
    failures: buildFailures(facts),
    latency: buildLatency(facts),
    models: buildModels(facts),
    breakdowns: buildBreakdowns(facts, window, names),
    evidence: await buildEvidence(facts, window, userId),
    apps: await buildConnectedApps(userId, facts, now),
  }
}

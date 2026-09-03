import config from "@/config"

import type { RunFact } from "@/lib/analytics/facts"
import {
  ascending,
  dayKey,
  dayKeys,
  percentile,
  type Window,
} from "@/lib/analytics/window"
import { isTerminal, RUN_STATUS_META, type RunStatus } from "@/lib/run-status"

/**
 * The KPI row: the five numbers the dashboard leads with.
 *
 * Percentiles are computed over the runs that RECORDED the key, never
 * over every run — `total_ms` is present on 69 of 71 rows and a stage key
 * on as few as 42, so dividing by the run count would quietly deflate
 * every latency figure. `samples` travels with each statistic so the panel
 * can say what it is speaking for.
 */

export interface Percentiles {
  p50: number | null
  p95: number | null
  max: number | null
  samples: number
}

export interface Kpis {
  total: number
  done: number
  failed: number
  inFlight: number
  /** Of the runs that FINISHED. An in-flight run has no outcome yet and
   *  counting it as a failure would report a falling success rate every
   *  time someone submits a video. */
  successRate: number | null
  previousSuccessRate: number | null
  totalMs: Percentiles
  targetMs: number
  evidence: {
    extracted: number
    verified: number
    flagged: number
    verifiedRate: number | null
    runs: number
  }
  perDay: { day: string; runs: number }[]
}

export function percentiles(values: number[]): Percentiles {
  const sorted = ascending(values)
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted.length > 0 ? sorted[sorted.length - 1] : null,
    samples: sorted.length,
  }
}

function successRate(facts: RunFact[]): number | null {
  const finished = facts.filter((fact) => isTerminal(fact.status))
  if (finished.length === 0) return null
  const done = finished.filter((fact) => fact.status === "done").length
  return done / finished.length
}

export interface StatusCount {
  status: RunStatus
  label: string
  count: number
}

export function statusCounts(facts: RunFact[]): StatusCount[] {
  return (Object.keys(RUN_STATUS_META) as RunStatus[])
    .map((status) => ({
      status,
      label: RUN_STATUS_META[status].label,
      count: facts.filter((fact) => fact.status === status).length,
    }))
    .filter((row) => row.count > 0)
}

/** Dense day series — a day with no runs is a zero, not a missing x. */
export function runsPerDay(
  facts: RunFact[],
  window: Window,
): { day: string; runs: number }[] {
  if (facts.length === 0) return []
  const from =
    window.from ?? Math.min(...facts.map((fact) => fact.createdAt))
  const counts = new Map<string, number>()
  for (const fact of facts) {
    const key = dayKey(fact.createdAt)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return dayKeys(from, window.to).map((day) => ({
    day,
    runs: counts.get(day) ?? 0,
  }))
}

export function buildKpis(
  facts: RunFact[],
  previous: RunFact[],
  window: Window,
): Kpis {
  const scored = facts.filter((fact) => fact.evidence !== null)
  const extracted = scored.reduce(
    (sum, fact) => sum + (fact.evidence?.extracted ?? 0),
    0,
  )
  const verified = scored.reduce(
    (sum, fact) => sum + (fact.evidence?.verified ?? 0),
    0,
  )
  const flagged = scored.reduce(
    (sum, fact) => sum + (fact.evidence?.flagged ?? 0),
    0,
  )

  const totals = facts
    .map((fact) => fact.timings.total_ms)
    .filter((ms): ms is number => typeof ms === "number")

  return {
    total: facts.length,
    done: facts.filter((fact) => fact.status === "done").length,
    failed: facts.filter((fact) => fact.status === "failed").length,
    inFlight: facts.filter((fact) => !isTerminal(fact.status)).length,
    successRate: successRate(facts),
    previousSuccessRate: previous.length > 0 ? successRate(previous) : null,
    totalMs: percentiles(totals),
    targetMs: config.analytics.targetTotalMs,
    evidence: {
      extracted,
      verified,
      flagged,
      verifiedRate: extracted > 0 ? verified / extracted : null,
      runs: scored.length,
    },
    perDay: runsPerDay(facts, window),
  }
}

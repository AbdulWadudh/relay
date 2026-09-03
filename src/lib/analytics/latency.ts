import config from "@/config"

import type { RunFact } from "@/lib/analytics/facts"
import { percentiles } from "@/lib/analytics/overview"
import {
  PIPELINE_STAGES,
  RUN_STATUS_META,
  type RunStatus,
} from "@/lib/run-status"

/**
 * Where a run's time goes, per stage.
 *
 * Stage order and the timing keys each stage owns come from
 * RUN_STATUS_META — the canonical map — so this never restates which key
 * belongs to which stage. A stage contributes a duration for a run only
 * when it recorded at least one of its keys; `samples` carries how many
 * runs that was, because coverage is uneven (`publish_ms` is on well under
 * two thirds of runs) and a percentile over four samples is not the same
 * claim as one over fifty.
 *
 * The p50 and p95 series are returned separately and are NOT to be drawn
 * on one axis: the tail runs an order of magnitude past the median, so a
 * shared linear scale renders every median bar as a sliver, and a second
 * y-scale would invent a relationship the data does not contain.
 */

export interface StageLatency {
  stage: RunStatus
  label: string
  p50: number | null
  p95: number | null
  max: number | null
  samples: number
  /** Below config.analytics.minSamples — plotted, but marked as thin. */
  thin: boolean
  /** Share of the summed stage medians, 0–1. */
  medianShare: number
}

export interface Latency {
  stages: StageLatency[]
  /** Sum of the per-stage medians. NOT the median run's total: medians do
   *  not add. Carried so the composition strip can state what it is. */
  medianSum: number
  /** The real median of `total_ms`, for the honest comparison. */
  totalP50: number | null
  totalP95: number | null
  targetMs: number
}

/** A stage's duration for one run: its recorded keys, summed. Null when
 *  the run recorded none of them — the stage did not run, or predates the
 *  key, and either way it must not enter the sample as a zero. */
function stageMs(fact: RunFact, stage: RunStatus): number | null {
  const values = RUN_STATUS_META[stage].timingKeys
    .map((key) => fact.timings[key])
    .filter((value): value is number => typeof value === "number")
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0)
}

export function buildLatency(facts: RunFact[]): Latency {
  const measured = PIPELINE_STAGES.map((stage) => {
    const samples = facts
      .map((fact) => stageMs(fact, stage))
      .filter((ms): ms is number => ms !== null)
    return { stage, stats: percentiles(samples) }
  }).filter((row) => row.stats.samples > 0)

  const medianSum = measured.reduce((sum, row) => sum + (row.stats.p50 ?? 0), 0)

  const totals = facts
    .map((fact) => fact.timings.total_ms)
    .filter((ms): ms is number => typeof ms === "number")
  const total = percentiles(totals)

  return {
    stages: measured.map((row) => ({
      stage: row.stage,
      label: RUN_STATUS_META[row.stage].label,
      p50: row.stats.p50,
      p95: row.stats.p95,
      max: row.stats.max,
      samples: row.stats.samples,
      thin: row.stats.samples < config.analytics.minSamples,
      medianShare: medianSum > 0 ? (row.stats.p50 ?? 0) / medianSum : 0,
    })),
    medianSum,
    totalP50: total.p50,
    totalP95: total.p95,
    targetMs: config.analytics.targetTotalMs,
  }
}

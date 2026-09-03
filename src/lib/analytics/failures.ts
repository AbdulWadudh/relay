import config from "@/config"

import type { RunFact } from "@/lib/analytics/facts"
import { RUN_STATUS_META, type RunStatus } from "@/lib/run-status"

/**
 * Failure anatomy: which stage a run died in, and what it died of.
 *
 * The most valuable panel on the dashboard, because the shape of the real
 * data is lopsided — the great majority of failures land in one stage, and
 * a chart that does not make that obvious in one glance has failed at its
 * job.
 *
 * Error codes have no registry to read: `codeOf` in
 * src/lib/pipeline-errors.ts derives them from whichever error class was
 * thrown, so the set is open. Nothing here matches on a specific code —
 * they are counted, sorted, and title-cased for display, so a code added
 * upstream appears without an edit.
 */

const UNKNOWN_STAGE = "unknown"

export interface FailureCode {
  code: string
  label: string
  count: number
}

export interface FailureStage {
  stage: string
  label: string
  count: number
  codes: FailureCode[]
}

export interface FailureAnatomy {
  totalFailed: number
  stages: FailureStage[]
  /** Legend series, largest first, tail folded — never a generated hue. */
  codes: FailureCode[]
  /** The one sentence the panel leads with. */
  lead: { label: string; count: number; share: number } | null
  /** Failures the pipeline classified as never worth retrying. */
  permanent: number
}

/** SOURCE_UNAVAILABLE -> "Source unavailable". */
export function humanizeCode(code: string): string {
  const words = code.toLowerCase().replace(/_/g, " ").trim()
  return words.length === 0 ? code : words[0].toUpperCase() + words.slice(1)
}

function stageLabel(stage: string): string {
  return stage === UNKNOWN_STAGE
    ? "Stage not recorded"
    : (RUN_STATUS_META[stage as RunStatus]?.label ?? stage)
}

function tally(values: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

function toCodes(counts: Map<string, number>): FailureCode[] {
  return [...counts.entries()]
    .map(([code, count]) => ({ code, label: humanizeCode(code), count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
}

/**
 * Caps the legend at `topN` and folds everything past it into one
 * "Other" series. A ninth categorical hue is indistinguishable from an
 * existing one under colour-vision deficiency, so the tail is collapsed
 * rather than coloured.
 */
function foldTail(codes: FailureCode[], limit: number): FailureCode[] {
  if (codes.length <= limit) return codes
  const head = codes.slice(0, limit - 1)
  const tail = codes.slice(limit - 1)
  return [
    ...head,
    {
      code: "__other",
      label: `Other (${tail.length} codes)`,
      count: tail.reduce((sum, entry) => sum + entry.count, 0),
    },
  ]
}

export function buildFailures(facts: RunFact[]): FailureAnatomy {
  const failed = facts.filter((fact) => fact.status === "failed")

  const legend = foldTail(
    toCodes(tally(failed.map((fact) => fact.errorCode ?? "UNKNOWN"))),
    config.analytics.topN,
  )
  const kept = new Set(legend.map((entry) => entry.code))

  const stages: FailureStage[] = [
    ...tally(failed.map((fact) => fact.failedStage ?? UNKNOWN_STAGE)).entries(),
  ]
    .map(([stage, count]) => {
      const codes = toCodes(
        tally(
          failed
            .filter((fact) => (fact.failedStage ?? UNKNOWN_STAGE) === stage)
            // A code folded out of the legend must fold here too, or the
            // stacked row would carry a series the legend cannot name.
            .map((fact) => {
              const code = fact.errorCode ?? "UNKNOWN"
              return kept.has(code) ? code : "__other"
            }),
        ),
      ).map((entry) =>
        entry.code === "__other"
          ? {
              ...entry,
              label: legend.find((l) => l.code === "__other")?.label ?? "Other",
            }
          : entry,
      )
      return { stage, label: stageLabel(stage), count, codes }
    })
    .sort((a, b) => b.count - a.count)

  const top = stages[0]
  return {
    totalFailed: failed.length,
    stages,
    codes: legend,
    lead:
      top && failed.length > 0
        ? {
            label: top.label,
            count: top.count,
            share: top.count / failed.length,
          }
        : null,
    permanent: failed.filter((fact) => fact.permanent).length,
  }
}

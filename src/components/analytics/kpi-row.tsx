"use client"

import { Meter, Sparkline } from "@/components/charts/meter"
import { StatTile, StatTileSkeleton } from "@/components/charts/stat-tile"
import {
  formatCount,
  formatMs,
  formatPercent,
  seriesColor,
  statusColor,
} from "@/components/charts/tokens"
import type { Kpis } from "@/lib/analytics/overview"
import { ANALYTICS_RANGES, type AnalyticsRange } from "@/lib/analytics/window"

/**
 * Numbers first, shape second.
 *
 * FIVE IDENTICAL TILES. Success rate used to be a display-size hero
 * spanning two columns with an accent stripe and no chart child — four
 * differences at once, which read as a broken card rather than as
 * emphasis (human decision 2026-09-04). Now every tile carries a label, a
 * value at the same size, a hint and a visual of one reserved height, so
 * the row is one rhythm. No accent stripes: five bars of colour down the
 * left encoded nothing the values did not already say. Hierarchy is
 * carried by ORDER — success rate is still first.
 *
 * The latency tiles are METERS against the PRD's 30s target rather than
 * bare numbers, because "19s" and "7 minutes" mean nothing without the
 * line they are measured against, and a meter puts the line on screen.
 * The p95 meter is deliberately allowed to blow past its track: pinning
 * it at 100% would hide the entire tail.
 */

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"

function deltaFor(
  kpis: Kpis,
  range: AnalyticsRange,
): { text: string; good: boolean | null } | undefined {
  if (kpis.successRate === null || kpis.previousSuccessRate === null) {
    return undefined
  }
  const points = (kpis.successRate - kpis.previousSuccessRate) * 100
  const label = ANALYTICS_RANGES.find((r) => r.id === range)?.label ?? range
  return {
    text: `${points >= 0 ? "+" : ""}${points.toFixed(1)} pts vs previous ${label.replace(/^Last /, "")}`,
    good: points >= 0,
  }
}

export function KpiRow({ kpis, range }: { kpis: Kpis; range: AnalyticsRange }) {
  const healthy = (kpis.successRate ?? 0) >= 0.9
  const overTarget =
    kpis.totalMs.p95 !== null && kpis.totalMs.p95 > kpis.targetMs

  return (
    <div className={GRID}>
      <StatTile
        label="Success rate"
        value={formatPercent(kpis.successRate, 1)}
        delta={deltaFor(kpis, range)}
        hint={`${kpis.done} done · ${kpis.failed} failed · ${kpis.inFlight} in flight`}
      >
        <Meter
          value={kpis.done}
          limit={Math.max(kpis.done + kpis.failed, 1)}
          label="of finished runs"
          valueText={`${kpis.done}`}
          limitText={`${kpis.done + kpis.failed}`}
          fill={statusColor(healthy ? "good" : "critical")}
        />
      </StatTile>

      <StatTile
        label="Runs"
        value={formatCount(kpis.total)}
        hint={`${kpis.perDay.length} days in this window`}
      >
        <Sparkline
          points={kpis.perDay.map((day) => day.runs)}
          accent={seriesColor(0)}
          label={`Runs per day: ${kpis.perDay.map((d) => `${d.day} ${d.runs}`).join(", ")}`}
        />
      </StatTile>

      <StatTile
        label="Median run"
        value={formatMs(kpis.totalMs.p50)}
        hint={`n=${kpis.totalMs.samples} runs recorded a total`}
      >
        <Meter
          value={kpis.totalMs.p50}
          limit={kpis.targetMs}
          label="vs target"
          valueText={formatMs(kpis.totalMs.p50)}
          limitText={formatMs(kpis.targetMs)}
          fill={statusColor(
            (kpis.totalMs.p50 ?? 0) <= kpis.targetMs ? "good" : "critical",
          )}
        />
      </StatTile>

      <StatTile
        label="Slowest 5% (p95)"
        value={formatMs(kpis.totalMs.p95)}
        hint={`worst run ${formatMs(kpis.totalMs.max)}`}
      >
        <Meter
          value={kpis.totalMs.p95}
          limit={kpis.targetMs}
          label="vs target"
          valueText={formatMs(kpis.totalMs.p95)}
          limitText={formatMs(kpis.targetMs)}
          fill={statusColor(overTarget ? "critical" : "good")}
        />
      </StatTile>

      <StatTile
        label="Evidence verified"
        value={formatPercent(kpis.evidence.verifiedRate, 1)}
        hint={`${formatCount(kpis.evidence.verified)} of ${formatCount(kpis.evidence.extracted)} claims · ${kpis.evidence.flagged} flagged`}
      >
        <Meter
          value={kpis.evidence.verified}
          limit={Math.max(kpis.evidence.extracted, 1)}
          label="grounded in the transcript"
          valueText={`${kpis.evidence.verified}`}
          limitText={`${kpis.evidence.extracted}`}
          fill={statusColor(
            (kpis.evidence.verifiedRate ?? 0) >= 0.85 ? "good" : "warning",
          )}
        />
      </StatTile>
    </div>
  )
}

export function KpiRowSkeleton() {
  return (
    <div className={GRID}>
      <StatTileSkeleton />
      <StatTileSkeleton />
      <StatTileSkeleton />
      <StatTileSkeleton />
      <StatTileSkeleton />
    </div>
  )
}

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
 * Success rate is the HERO figure — the one number the page leads with,
 * at display size, in the same sans as everything else. There is exactly
 * one per view.
 *
 * The two latency tiles are METERS against the PRD's 30s target rather
 * than bare numbers, because "19s" and "7 minutes" mean nothing without
 * the line they are being measured against, and a meter puts the line on
 * screen. The p95 meter is deliberately allowed to blow past its track:
 * pinning it at 100% would hide the entire tail.
 */

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6"

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
      <div className="xl:col-span-2">
        <StatTile
          hero
          label="Success rate"
          value={formatPercent(kpis.successRate, 1)}
          accent={statusColor(healthy ? "good" : "critical")}
          delta={deltaFor(kpis, range)}
          hint={`${kpis.done} done · ${kpis.failed} failed · ${kpis.inFlight} in flight`}
        />
      </div>

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
      <div className="xl:col-span-2">
        <StatTileSkeleton hero />
      </div>
      <StatTileSkeleton />
      <StatTileSkeleton />
      <StatTileSkeleton />
      <StatTileSkeleton />
    </div>
  )
}

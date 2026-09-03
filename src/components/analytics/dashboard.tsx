"use client"

import { useState } from "react"

import { AgentRouting } from "@/components/analytics/agent-routing"
import { ConnectedApps } from "@/components/analytics/connected-apps"
import { EvidenceQuality } from "@/components/analytics/evidence-quality"
import { FailureAnatomy } from "@/components/analytics/failure-anatomy"
import { KpiRow, KpiRowSkeleton } from "@/components/analytics/kpi-row"
import { ModelUsage } from "@/components/analytics/model-usage"
import { RangeFilter } from "@/components/analytics/range-filter"
import { SourcesModes } from "@/components/analytics/sources-modes"
import { StageLatency } from "@/components/analytics/stage-latency"
import { Throughput } from "@/components/analytics/throughput"
import { ShellContent, ShellHeader } from "@/components/app-shell"
import { ChartCardSkeleton } from "@/components/charts/chart-card"
import { QueryErrorState } from "@/components/query-error"
import { ScrollPanel } from "@/components/scroll-panel"
import { type AnalyticsRange, DEFAULT_RANGE } from "@/lib/analytics/window"
import { useAnalytics } from "@/lib/query/analytics"
import { cn } from "@/lib/utils"

/**
 * The dashboard shell (RULES.md, "List pages").
 *
 * `<ShellContent fill>` so the PAGE cannot scroll, one `ScrollPanel`
 * inside it as the single scroller, and `min-h-0` on every flex ancestor
 * between them. The filter sits in the header, above everything it
 * scopes, and stays put while the panels move.
 *
 * While a new range loads the previous render is held at reduced opacity
 * rather than replaced by skeletons — nine charts collapsing and
 * reappearing on every filter click is unreadable, and the layout is not
 * allowed to move.
 */

const PANEL_GRID = "grid grid-cols-1 gap-4 lg:grid-cols-6"

export function Dashboard() {
  const [range, setRange] = useState<AnalyticsRange>(DEFAULT_RANGE)
  const query = useAnalytics(range)
  const data = query.data

  return (
    <>
      <ShellHeader title="Dashboard">
        <RangeFilter range={range} onChange={setRange} />
      </ShellHeader>
      {/* Tighter horizontal padding than the shell default on a phone:
          16px of shell plus the scroller's own 12px put 28px of nothing
          either side of a 390px screen. Vertical padding is untouched, and
          so is every other page. */}
      <ShellContent fill className="px-2 sm:px-8">
        <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4">
          {/* No track on phone or tablet, where scrolling is a touch
              gesture and a persistent 10px bar is just a stripe down the
              edge — but it comes BACK from `lg` up, where a pointer user
              wants the position cue (human decision 2026-09-04). */}
          <ScrollPanel
            bordered={false}
            className="[&_[data-slot=scroll-area-scrollbar]]:hidden lg:[&_[data-slot=scroll-area-scrollbar]]:flex"
          >
            <div
              className={cn(
                // Gutters are SYMMETRIC. The card ring is an outward
                // box-shadow, so every edge needs room or the scrollport
                // clips it — but 4px start against 16px end (to clear the
                // 10px overlay scrollbar) read as the whole page sitting
                // off-centre. px-3 clears the bar on the right and matches
                // it on the left.
                "flex flex-col gap-4 px-3 pt-1 pb-2 transition-opacity duration-200",
                query.isFetching && !query.isPending && "opacity-60",
              )}
            >
              {query.isError ? (
                <QueryErrorState
                  entity="the dashboard"
                  error={query.error}
                  onRetry={() => query.refetch()}
                />
              ) : !data ? (
                <DashboardSkeleton />
              ) : (
                <>
                  <KpiRow kpis={data.kpis} range={range} />

                  <div className={PANEL_GRID}>
                    <div className="lg:col-span-6">
                      <FailureAnatomy data={data.failures} />
                    </div>
                    <div className="lg:col-span-6">
                      <StageLatency data={data.latency} />
                    </div>
                    <div className="lg:col-span-4">
                      <Throughput data={data.breakdowns.throughput} />
                    </div>
                    <div className="lg:col-span-2">
                      <SourcesModes
                        sources={data.breakdowns.sources}
                        modes={data.breakdowns.modes}
                      />
                    </div>
                    {/* Model usage grows with the provider count, so it
                        gets a row to itself — pairing it with a
                        fixed-height panel stretched that neighbour and
                        left a void where its data ran out. */}
                    <div className="lg:col-span-6">
                      <ModelUsage data={data.models} />
                    </div>
                    <div className="lg:col-span-3">
                      <AgentRouting
                        agents={data.breakdowns.agents}
                        tail={data.breakdowns.agentTail}
                      />
                    </div>
                    <div className="lg:col-span-3">
                      <EvidenceQuality data={data.evidence} />
                    </div>
                    <div className="lg:col-span-6">
                      <ConnectedApps apps={data.apps} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollPanel>
        </div>
      </ShellContent>
    </>
  )
}

/** Mirrors the real grid exactly, at the real heights, so nothing moves
 *  between the loading state and the loaded one. */
function DashboardSkeleton() {
  return (
    <>
      <KpiRowSkeleton />
      <div className={PANEL_GRID}>
        <div className="lg:col-span-6">
          <ChartCardSkeleton height={260} />
        </div>
        <div className="lg:col-span-6">
          <ChartCardSkeleton height={300} mobileHeight={520} />
        </div>
        <div className="lg:col-span-4">
          <ChartCardSkeleton height={240} />
        </div>
        <div className="lg:col-span-2">
          <ChartCardSkeleton height={260} />
        </div>
        <div className="lg:col-span-6">
          <ChartCardSkeleton height={260} />
        </div>
        <div className="lg:col-span-3">
          <ChartCardSkeleton height={260} />
        </div>
        <div className="lg:col-span-3">
          <ChartCardSkeleton height={260} />
        </div>
        <div className="lg:col-span-6">
          <ChartCardSkeleton height={220} />
        </div>
      </div>
    </>
  )
}

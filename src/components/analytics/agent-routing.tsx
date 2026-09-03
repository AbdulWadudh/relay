"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import { RoundedBar } from "@/components/charts/bar-shape"
import { ChartCard, ChartEmpty } from "@/components/charts/chart-card"
import { ChartTable } from "@/components/charts/chart-table"
import {
  formatPercent,
  MARK,
  seriesColor,
  VIZ,
} from "@/components/charts/tokens"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { Slice } from "@/lib/analytics/breakdowns"

/**
 * Which agents actually handle the work.
 *
 * ONE SERIES, ONE COLOUR — every bar wears categorical slot 1. Agents are
 * nominal: shading them darker-where-bigger would re-encode bar length as
 * hue, burn the only free channel on information the chart already shows,
 * and fail the categorical checks by design.
 *
 * Two rows are deliberately not agents and take the de-emphasis grey so
 * they cannot be mistaken for one: the folded tail, and "Never routed" —
 * runs that died before the router ever ran, which is a real and large
 * bucket rather than a gap.
 */

const CHART_HEIGHT = 260
const NON_AGENT = new Set(["__other", "__unrouted"])

export function AgentRouting({
  agents,
  tail,
}: {
  agents: Slice[]
  tail: number
}) {
  const config: ChartConfig = { count: { label: "Runs" } }

  const rows = agents.map((agent) => ({
    ...agent,
    color: NON_AGENT.has(agent.id) ? VIZ.muted : seriesColor(0),
  }))

  const table = (
    <ChartTable
      rows={agents}
      rowKey={(row) => row.id}
      columns={[
        {
          key: "label",
          header: "Agent",
          wrapAnywhere: true,
          cell: (r) => r.label,
        },
        { key: "count", header: "Runs", numeric: true, cell: (r) => r.count },
        {
          key: "ok",
          header: "Success",
          numeric: true,
          cell: (r) => formatPercent(r.successRate),
        },
      ]}
    />
  )

  return (
    <ChartCard
      title="Agent routing"
      subtitle={
        tail > 0
          ? `Top agents by run count; ${tail} rarer agents are folded into "Other".`
          : "Agents by run count."
      }
      caption='"Never routed" is not an agent — those runs failed before the router ran.'
      table={table}
      height={CHART_HEIGHT}
    >
      {rows.length === 0 ? (
        <ChartEmpty message="No runs in this window." />
      ) : (
        <ChartContainer config={config} className="aspect-auto h-full w-full">
          <BarChart
            accessibilityLayer
            data={rows}
            layout="vertical"
            margin={{ left: 4, right: 36, top: 4, bottom: 4 }}
            barCategoryGap="24%"
          >
            <CartesianGrid horizontal={false} stroke={VIZ.grid} />
            <XAxis
              type="number"
              allowDecimals={false}
              stroke={VIZ.axis}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              interval={0}
              width={132}
              stroke={VIZ.axis}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)" }}
              content={<ChartTooltipContent />}
            />
            <Bar
              dataKey="count"
              maxBarSize={MARK.barSize}
              isAnimationActive={false}
              fill={seriesColor(0)}
              shape={(props: { payload?: { color?: string } }) => (
                <RoundedBar {...props} fill={props.payload?.color} />
              )}
            >
              {/* Selective, not a number on every mark: counts here ARE the
                  data and the axis alone makes short rows ambiguous. */}
              <LabelList
                dataKey="count"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={11}
                fontWeight={600}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  )
}

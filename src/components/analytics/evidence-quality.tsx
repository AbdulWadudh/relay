"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { ChartCard, ChartEmpty } from "@/components/charts/chart-card"
import { ChartTable } from "@/components/charts/chart-table"
import {
  formatDay,
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
import type { Evidence } from "@/lib/analytics/evidence"

/**
 * How much of what the agents wrote is actually grounded in the source.
 *
 * ONE SERIES, so no legend box — the title names it. A day on which
 * nothing was scored is a GAP in the line, not a zero: drawing 0% would
 * assert that day's extractions were all clean when in fact none were
 * attempted, and a gap reads as "no data" to everyone.
 *
 * The reasons list is the useful half. "13% flagged" is a number;
 * "mostly partially-grounded, rarely absent from the source" is a
 * finding, and only one of them tells you whether to change the prompt or
 * the matcher.
 */

const CHART_HEIGHT = 260

export function EvidenceQuality({ data }: { data: Evidence }) {
  const config: ChartConfig = {
    flaggedRate: { label: "Flagged", color: seriesColor(7) },
  }

  const points = data.perDay.filter((day) => day.extracted > 0)
  const flaggedRate = data.extracted > 0 ? data.flagged / data.extracted : null

  const table = (
    <ChartTable
      rows={points}
      rowKey={(row) => row.day}
      columns={[
        { key: "day", header: "Day", cell: (r) => formatDay(r.day) },
        {
          key: "extracted",
          header: "Claims",
          numeric: true,
          cell: (r) => r.extracted,
        },
        {
          key: "flagged",
          header: "Flagged",
          numeric: true,
          cell: (r) => r.flagged,
        },
        {
          key: "rate",
          header: "Rate",
          numeric: true,
          cell: (r) => formatPercent(r.flaggedRate, 1),
        },
      ]}
    />
  )

  return (
    <ChartCard
      title="Evidence quality"
      subtitle={
        <>
          {data.flagged} of {data.extracted} claims flagged (
          {formatPercent(flaggedRate, 1)}) across {data.runs} scored runs.
        </>
      }
      caption="Days where nothing was scored are gaps, not zeroes. A flagged claim is kept with its reason recorded, never dropped."
      table={table}
      height={CHART_HEIGHT}
    >
      {data.extracted === 0 ? (
        <ChartEmpty message="No extractions were scored in this window." />
      ) : (
        <div className="flex h-full flex-col gap-3">
          <ChartContainer
            config={config}
            className="aspect-auto min-h-0 w-full flex-1"
          >
            <LineChart
              accessibilityLayer
              data={data.perDay}
              margin={{ left: 4, right: 12, top: 8, bottom: 4 }}
            >
              <CartesianGrid vertical={false} stroke={VIZ.grid} />
              <XAxis
                dataKey="day"
                stroke={VIZ.axis}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={formatDay}
                tickLine={false}
                axisLine={false}
                minTickGap={16}
              />
              <YAxis
                width={40}
                domain={[0, "auto"]}
                stroke={VIZ.axis}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={(value) => formatPercent(Number(value))}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => formatDay(String(label))}
                    formatter={(value) => formatPercent(Number(value), 1)}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="flaggedRate"
                stroke="var(--color-flaggedRate)"
                strokeWidth={MARK.lineWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                // The gap is the point — never bridge a day with no data.
                connectNulls={false}
                dot={{
                  r: MARK.dotRadius,
                  fill: "var(--color-flaggedRate)",
                  stroke: VIZ.surface,
                  strokeWidth: MARK.gap,
                }}
                activeDot={{ r: MARK.dotRadius + 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>

          {data.reasons.length > 0 ? (
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {data.reasons.map((reason) => (
                <li
                  key={reason.reason}
                  className="text-muted-foreground text-xs"
                >
                  <span className="font-medium text-foreground tabular-nums">
                    {reason.count}
                  </span>{" "}
                  {reason.label.toLowerCase()}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </ChartCard>
  )
}

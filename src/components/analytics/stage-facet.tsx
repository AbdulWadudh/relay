"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { RoundedBar } from "@/components/charts/bar-shape"
import { formatMs, MARK, VIZ } from "@/components/charts/tokens"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

/**
 * One facet of the stage-latency small multiple. Split from
 * stage-latency.tsx only to stay under the 250-line cap (RULES.md).
 *
 * Its own axis, and the heading names the measure — two scales in one
 * panel are only safe when each one says what it is.
 */

export interface Row extends Record<string, unknown> {
  label: string
  p50: number
  p95: number
  color: string
  samples: number
}

export function StagePercentileChart({
  rows,
  metric,
  heading,
}: {
  rows: Row[]
  metric: "p50" | "p95"
  heading: string
}) {
  const config: ChartConfig = { [metric]: { label: heading } }

  return (
    <div className="flex min-h-0 flex-col">
      <p className="mb-1 font-medium text-foreground text-xs">{heading}</p>
      <ChartContainer
        config={config}
        className="aspect-auto min-h-0 w-full flex-1"
      >
        <BarChart
          accessibilityLayer
          data={rows}
          layout="vertical"
          margin={{ left: 4, right: 48, top: 4, bottom: 4 }}
          barCategoryGap="26%"
        >
          <CartesianGrid horizontal={false} stroke={VIZ.grid} />
          <XAxis
            type="number"
            stroke={VIZ.axis}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(value) => formatMs(Number(value))}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            interval={0}
            width={78}
            stroke={VIZ.axis}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)" }}
            content={
              <ChartTooltipContent
                formatter={(value) => formatMs(Number(value))}
              />
            }
          />
          <Bar
            dataKey={metric}
            maxBarSize={MARK.barSize}
            radius={[0, MARK.radius, MARK.radius, 0]}
            isAnimationActive={false}
            // Colour follows the STAGE, so a row wears the same hue in
            // both facets and in the strip above.
            fill={VIZ.muted}
            shape={(props: { payload?: Row }) => (
              <RoundedBar {...props} fill={props.payload?.color ?? VIZ.muted} />
            )}
          />
        </BarChart>
      </ChartContainer>
    </div>
  )
}

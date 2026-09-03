"use client"

import {
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { verticalSegment } from "@/components/charts/bar-shape"
import { ChartCard, ChartEmpty } from "@/components/charts/chart-card"
import { ChartLegend } from "@/components/charts/chart-legend"
import { ChartTable } from "@/components/charts/chart-table"
import { formatDay, MARK, statusColor, VIZ } from "@/components/charts/tokens"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { DayThroughput } from "@/lib/analytics/breakdowns"

/**
 * Runs per day, split by outcome.
 *
 * Outcome MEANS good and bad here, so these wear status tokens rather
 * than categorical slots — and each ships an icon in the legend, so the
 * meaning never rests on hue alone. In-flight is not a status in that
 * fixed scale and takes the de-emphasis grey: it is a real segment, just
 * not a verdict.
 */

const CHART_HEIGHT = 240
const KEYS = ["done", "failed", "inFlight"] as const

export function Throughput({ data }: { data: DayThroughput[] }) {
  const config: ChartConfig = {
    done: { label: "Done", color: statusColor("good") },
    failed: { label: "Failed", color: statusColor("critical") },
    inFlight: { label: "In flight", color: VIZ.muted },
  }

  const busiest = data.reduce(
    (best, day) =>
      day.done + day.failed + day.inFlight > best.total
        ? { day: day.day, total: day.done + day.failed + day.inFlight }
        : best,
    { day: "", total: 0 },
  )

  const table = (
    <ChartTable
      rows={data.filter((day) => day.done + day.failed + day.inFlight > 0)}
      rowKey={(row) => row.day}
      columns={[
        { key: "day", header: "Day", cell: (row) => formatDay(row.day) },
        { key: "done", header: "Done", numeric: true, cell: (r) => r.done },
        {
          key: "failed",
          header: "Failed",
          numeric: true,
          cell: (r) => r.failed,
        },
        {
          key: "inFlight",
          header: "In flight",
          numeric: true,
          cell: (r) => r.inFlight,
        },
      ]}
    />
  )

  return (
    <ChartCard
      title="Throughput"
      subtitle="Runs submitted per day, by how they ended."
      caption={
        busiest.total > 0
          ? `Busiest day was ${formatDay(busiest.day)} with ${busiest.total} runs. Days with no runs are drawn as zero, not skipped.`
          : undefined
      }
      legend={
        <ChartLegend
          items={[
            {
              key: "done",
              label: "Done",
              color: statusColor("good"),
              icon: CheckmarkCircle02Icon,
            },
            {
              key: "failed",
              label: "Failed",
              color: statusColor("critical"),
              icon: CancelCircleIcon,
            },
            {
              key: "inFlight",
              label: "In flight",
              color: VIZ.muted,
              icon: Clock01Icon,
            },
          ]}
        />
      }
      table={table}
      height={CHART_HEIGHT}
    >
      {data.length === 0 ? (
        <ChartEmpty message="No runs in this window." />
      ) : (
        <ChartContainer config={config} className="aspect-auto h-full w-full">
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
            barCategoryGap="22%"
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
              allowDecimals={false}
              width={32}
              stroke={VIZ.axis}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => formatDay(String(label))}
                />
              }
            />
            {KEYS.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="runs"
                fill={`var(--color-${key})`}
                maxBarSize={MARK.barSize}
                shape={verticalSegment([...KEYS], key)}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  )
}

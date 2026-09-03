"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { StagePercentileChart } from "@/components/analytics/stage-facet"
import { horizontalSegment } from "@/components/charts/bar-shape"
import { ChartCard, ChartEmpty } from "@/components/charts/chart-card"
import { ChartLegend } from "@/components/charts/chart-legend"
import { ChartTable } from "@/components/charts/chart-table"
import { formatMs, seriesColor } from "@/components/charts/tokens"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { Latency } from "@/lib/analytics/latency"

/**
 * Where the time goes, and where the tail lives — as TWO charts.
 *
 * p95 runs roughly twenty times the median, so one shared linear axis
 * renders every median bar as a two-pixel sliver, and a second y-scale
 * would invent a relationship the data does not contain. Small multiples
 * with two clearly-labelled axes is the documented remedy: same stage
 * rows, same stage colours, two honest scales.
 *
 * The composition strip on top is a share of the per-stage MEDIANS. It is
 * not the median run's total and the caption says so — medians do not
 * add, and presenting their sum as a run's duration would be a lie that
 * happens to look tidy.
 */

const CHART_HEIGHT = 300
/** The two facets sit side by side from `sm` up and stack below it, so the
 *  card needs roughly double the height there or Recharts starts skipping
 *  category labels to fit. */
const CHART_HEIGHT_MOBILE = 520

export function StageLatency({ data }: { data: Latency }) {
  const keys = data.stages.map((stage) => stage.stage)

  const config: ChartConfig = Object.fromEntries(
    data.stages.map((stage, index) => [
      stage.stage,
      { label: stage.label, color: seriesColor(index) },
    ]),
  )

  const strip = [
    Object.fromEntries([
      ["name", "median"],
      ...data.stages.map((stage) => [stage.stage, stage.p50 ?? 0]),
    ]),
  ]

  const rows = data.stages.map((stage, index) => ({
    label: stage.label,
    p50: stage.p50 ?? 0,
    p95: stage.p95 ?? 0,
    color: seriesColor(index),
    samples: stage.samples,
    thin: stage.thin,
  }))

  const thin = data.stages.filter((stage) => stage.thin)

  const table = (
    <ChartTable
      rows={data.stages}
      rowKey={(row) => row.stage}
      collapseBelow="sm"
      columns={[
        { key: "stage", header: "Stage", cell: (row) => row.label },
        {
          key: "p50",
          header: "Median",
          numeric: true,
          cell: (row) => formatMs(row.p50),
        },
        {
          key: "p95",
          header: "p95",
          numeric: true,
          cell: (row) => formatMs(row.p95),
        },
        {
          key: "max",
          header: "Worst",
          numeric: true,
          secondary: true,
          cell: (row) => formatMs(row.max),
        },
        {
          key: "n",
          header: "Runs",
          numeric: true,
          secondary: true,
          cell: (row) => row.samples,
        },
      ]}
    />
  )

  return (
    <ChartCard
      title="Stage latency"
      subtitle={
        <>
          A median run totals{" "}
          <strong className="font-semibold text-foreground">
            {formatMs(data.totalP50)}
          </strong>{" "}
          against a {formatMs(data.targetMs)} target, but the slowest 5% take{" "}
          <strong className="font-semibold text-foreground">
            {formatMs(data.totalP95)}
          </strong>
          .
        </>
      }
      caption={`The two axes below are independent — p95 runs about ${data.totalP50 && data.totalP95 ? Math.round(data.totalP95 / data.totalP50) : 20}× the median, so plotting them together would flatten the medians to nothing. The strip is a share of per-stage medians, not a run's total: medians do not sum.${thin.length > 0 ? ` Thin sample: ${thin.map((s) => s.label.toLowerCase()).join(", ")}.` : ""}`}
      legend={
        <ChartLegend
          items={data.stages.map((stage, index) => ({
            key: stage.stage,
            label: `${stage.label} (n=${stage.samples})`,
            color: seriesColor(index),
          }))}
        />
      }
      table={table}
      height={CHART_HEIGHT}
      mobileHeight={CHART_HEIGHT_MOBILE}
    >
      {data.stages.length === 0 ? (
        <ChartEmpty message="No stage timings recorded in this window." />
      ) : (
        <div className="flex h-full flex-col gap-3">
          <ChartContainer config={config} className="aspect-auto h-10 w-full">
            <BarChart
              accessibilityLayer
              data={strip}
              layout="vertical"
              margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatMs(Number(value))}
                  />
                }
              />
              {data.stages.map((stage) => (
                <Bar
                  key={stage.stage}
                  dataKey={stage.stage}
                  stackId="share"
                  fill={`var(--color-${stage.stage})`}
                  maxBarSize={16}
                  shape={horizontalSegment(keys, stage.stage)}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ChartContainer>

          <div className="grid min-h-0 flex-1 gap-4 sm:grid-cols-2">
            <StagePercentileChart
              rows={rows}
              metric="p50"
              heading="Median time per stage"
            />
            <StagePercentileChart
              rows={rows}
              metric="p95"
              heading="p95 — the tail"
            />
          </div>
        </div>
      )}
    </ChartCard>
  )
}

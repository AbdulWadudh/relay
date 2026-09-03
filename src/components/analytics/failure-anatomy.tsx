"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { horizontalSegment } from "@/components/charts/bar-shape"
import { ChartCard, ChartEmpty } from "@/components/charts/chart-card"
import { ChartLegend } from "@/components/charts/chart-legend"
import { ChartTable } from "@/components/charts/chart-table"
import { MARK, plural, seriesColor, VIZ } from "@/components/charts/tokens"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { FailureAnatomy as Anatomy } from "@/lib/analytics/failures"

/**
 * Where runs die, and of what.
 *
 * A stage x code heatmap was the obvious form and the wrong one: the
 * cross is mostly empty (a code belongs to one stage almost always), so
 * it would be a dozen cells with four filled. Three sorted rows put the
 * dominant stage at the top at three times the length of the next one,
 * which is the one thing this panel exists to say.
 *
 * Codes are nominal — no code is "more" than another — so they take
 * categorical slots in the fixed order, and the tail past the cap is
 * already folded into "Other" upstream rather than getting a ninth hue.
 */

const CHART_HEIGHT = 260

/**
 * The row total, direct-labelled on the axis rather than at the bar tip.
 *
 * Recharts can only hang a LabelList off one <Bar>, and which segment is
 * outermost varies by row — so a tip label would appear on some rows and
 * vanish on others. On the axis it is always present, never collides with
 * a mark, and survives a 390px viewport.
 */
function StageTick({
  x,
  y,
  payload,
  totals,
}: {
  x?: number
  y?: number
  payload?: { value?: string }
  totals: Map<string, number>
}) {
  const label = payload?.value ?? ""
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text
        x={-8}
        y={-2}
        textAnchor="end"
        className="fill-foreground"
        fontSize={12}
        fontWeight={500}
      >
        {label}
      </text>
      <text
        x={-8}
        y={13}
        textAnchor="end"
        className="fill-muted-foreground"
        fontSize={11}
      >
        {plural(totals.get(label) ?? 0, "run")}
      </text>
    </g>
  )
}

export function FailureAnatomy({ data }: { data: Anatomy }) {
  const keys = data.codes.map((code) => code.code)

  const config: ChartConfig = Object.fromEntries(
    data.codes.map((code, index) => [
      code.code,
      { label: code.label, color: seriesColor(index) },
    ]),
  )

  const totals = new Map(data.stages.map((stage) => [stage.label, stage.count]))

  const rows = data.stages.map((stage) => ({
    label: stage.label,
    total: stage.count,
    ...Object.fromEntries(stage.codes.map((code) => [code.code, code.count])),
  }))

  const table = (
    <ChartTable
      rows={data.stages.flatMap((stage) =>
        stage.codes.map((code) => ({ stage: stage.label, ...code })),
      )}
      rowKey={(row) => `${row.stage}-${row.code}`}
      columns={[
        { key: "stage", header: "Stage", cell: (row) => row.stage },
        { key: "code", header: "Error", cell: (row) => row.label },
        {
          key: "count",
          header: "Runs",
          numeric: true,
          cell: (row) => row.count,
        },
      ]}
    />
  )

  return (
    <ChartCard
      title="Failure anatomy"
      subtitle={
        data.lead ? (
          <>
            <strong className="font-semibold text-foreground">
              {data.lead.count} of {data.totalFailed}
            </strong>{" "}
            failures happen in {data.lead.label.toLowerCase()} —{" "}
            {Math.round(data.lead.share * 100)}% of everything that fails.
          </>
        ) : (
          "Nothing has failed in this window."
        )
      }
      caption={`${data.permanent} of ${data.totalFailed} were classified permanent, so a retry would fail identically. Bars stack by error code; hover a segment or open the table for exact counts.`}
      legend={
        <ChartLegend
          items={data.codes.map((code, index) => ({
            key: code.code,
            label: `${code.label} (${code.count})`,
            color: seriesColor(index),
          }))}
        />
      }
      table={table}
      height={CHART_HEIGHT}
    >
      {rows.length === 0 ? (
        <ChartEmpty message="No failed runs in this window." />
      ) : (
        <ChartContainer config={config} className="aspect-auto h-full w-full">
          <BarChart
            accessibilityLayer
            data={rows}
            layout="vertical"
            margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
            barCategoryGap="28%"
          >
            <CartesianGrid horizontal={false} stroke={VIZ.grid} />
            <XAxis
              type="number"
              allowDecimals={false}
              stroke={VIZ.axis}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              interval={0}
              width={104}
              stroke={VIZ.axis}
              tick={<StageTick totals={totals} />}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)" }}
              content={<ChartTooltipContent />}
            />
            {data.codes.map((code) => (
              <Bar
                key={code.code}
                dataKey={code.code}
                stackId="failures"
                fill={`var(--color-${code.code})`}
                maxBarSize={MARK.barSize}
                shape={horizontalSegment(keys, code.code)}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  )
}

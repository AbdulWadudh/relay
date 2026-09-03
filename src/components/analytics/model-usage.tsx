"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"

import { horizontalSegment } from "@/components/charts/bar-shape"
import { ChartCard, ChartEmpty } from "@/components/charts/chart-card"
import { ChartLegend } from "@/components/charts/chart-legend"
import { ChartTable } from "@/components/charts/chart-table"
import {
  ellipsize,
  MARK,
  plural,
  seriesColor,
  VIZ,
} from "@/components/charts/tokens"
import { ProviderMark } from "@/components/provider-mark"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { Models } from "@/lib/analytics/models"

/**
 * Which models did the work, how often, for which stage.
 *
 * COLOUR ENCODES THE STAGE, not the provider. Grouping the rows under a
 * provider heading already encodes the provider, and spending the
 * identity channel on it a second time would say nothing the layout does
 * not. So the reader gets both dimensions at once: position for who,
 * colour for what.
 *
 * Each provider group is its own small chart on its own axis. That is
 * deliberate — one shared axis across providers would compress the
 * smaller ones into nothing, and the question here is "which model
 * within this provider", not "is Groq bigger than OpenRouter" (the group
 * heading answers that).
 *
 * The card GROWS with its groups instead of capping and scrolling. A
 * nested scrollbar inside a chart card is the anti-pattern this rule
 * exists to prevent, and the dashboard already has exactly one scroller.
 */

const ROW_HEIGHT = 34
const AXIS_WIDTH = 176
/** Fits AXIS_WIDTH at 11px; the full id is in the tooltip and the table. */
const LABEL_MAX = 26

export function ModelUsage({ data }: { data: Models }) {
  const stageKeys = data.stages.map((stage) => stage.stage)

  const config: ChartConfig = Object.fromEntries(
    data.stages.map((stage, index) => [
      stage.stage,
      { label: stage.label, color: seriesColor(index) },
    ]),
  )

  const table = (
    <ChartTable
      rows={data.groups.flatMap((group) =>
        group.models.flatMap((model) =>
          model.byStage.map((stage) => ({
            provider: group.label,
            model: model.model,
            stage: stage.label,
            count: stage.count,
          })),
        ),
      )}
      rowKey={(row, index) =>
        `${row.provider}-${row.model}-${row.stage}-${index}`
      }
      collapseBelow="sm"
      columns={[
        { key: "provider", header: "Provider", cell: (r) => r.provider },
        {
          key: "model",
          header: "Model",
          wrapAnywhere: true,
          cell: (r) => r.model,
        },
        {
          key: "stage",
          header: "Stage",
          secondary: true,
          cell: (r) => r.stage,
        },
        { key: "count", header: "Calls", numeric: true, cell: (r) => r.count },
      ]}
    />
  )

  const height =
    data.groups.reduce(
      (sum, group) => sum + group.models.length * ROW_HEIGHT + 40,
      0,
    ) || 200

  return (
    <ChartCard
      title="Model usage"
      subtitle={`${data.total} model calls across ${data.groups.length} providers.`}
      caption={
        data.unrecorded.length > 0
          ? `${data.unrecorded.join(", ")} is missing because it records its model on the agent it creates, not on the run — not because it never ran. Recording it per run is a proposed change.`
          : undefined
      }
      legend={
        <ChartLegend
          items={data.stages.map((stage, index) => ({
            key: stage.stage,
            label: stage.label,
            color: seriesColor(index),
          }))}
        />
      }
      table={table}
      height={height}
    >
      {data.groups.length === 0 ? (
        <ChartEmpty message="No model calls recorded in this window." />
      ) : (
        <div className="flex h-full flex-col gap-5">
          {data.groups.map((group) => (
            <div key={group.provider}>
              <div className="mb-1 flex items-center gap-2">
                <ProviderMark provider={group.provider} className="size-4" />
                <span className="font-medium text-foreground text-xs">
                  {group.label}
                </span>
                <span className="text-muted-foreground text-xs">
                  {plural(group.total, "call")}
                </span>
              </div>
              <ChartContainer
                config={config}
                className="aspect-auto w-full"
                style={{ height: group.models.length * ROW_HEIGHT }}
              >
                <BarChart
                  accessibilityLayer
                  data={group.models.map((model) => ({
                    label: ellipsize(model.model, LABEL_MAX),
                    ...Object.fromEntries(
                      model.byStage.map((stage) => [stage.stage, stage.count]),
                    ),
                  }))}
                  layout="vertical"
                  margin={{ left: 4, right: 12, top: 2, bottom: 2 }}
                  barCategoryGap="24%"
                >
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    interval={0}
                    width={AXIS_WIDTH}
                    stroke={VIZ.axis}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    cursor={{ fill: "var(--muted)" }}
                    content={<ChartTooltipContent />}
                  />
                  {data.stages.map((stage) => (
                    <Bar
                      key={stage.stage}
                      dataKey={stage.stage}
                      stackId="calls"
                      fill={`var(--color-${stage.stage})`}
                      maxBarSize={MARK.barSize}
                      shape={horizontalSegment(stageKeys, stage.stage)}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  )
}

"use client"

import { ChartCard, ChartEmpty } from "@/components/charts/chart-card"
import { ChartTable } from "@/components/charts/chart-table"
import {
  formatPercent,
  MARK,
  seriesColor,
  VIZ,
} from "@/components/charts/tokens"
import type { Slice } from "@/lib/analytics/breakdowns"

/**
 * What kind of work arrives: which platform, and which analysis mode.
 *
 * Two part-to-whole questions with two and three classes. That is a
 * stacked bar, not a pie — a two-slice pie is a listed anti-pattern, and
 * a bar lets the share be direct-labelled without a leader line.
 *
 * Each row carries its success rate as text beside the count, because
 * "43 YouTube runs" and "43 YouTube runs, 57% of which succeed" are very
 * different facts and only one of them is actionable.
 *
 * Drawn as plain CSS rather than through Recharts: at one bar per
 * question a chart library adds an axis, a responsive container and a
 * tooltip layer to render three rectangles.
 */

function ShareBar({ rows }: { rows: Slice[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  if (total === 0) return null

  return (
    <div
      className="flex h-5 w-full overflow-hidden rounded-md"
      role="presentation"
    >
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="h-full first:rounded-s-md last:rounded-e-md"
          style={{
            width: `${(row.count / total) * 100}%`,
            background: seriesColor(index),
            // The 2px gap is subtracted width in the surface colour, not a
            // border drawn around the mark.
            marginInlineEnd: index === rows.length - 1 ? undefined : MARK.gap,
          }}
        />
      ))}
    </div>
  )
}

function Breakdown({ heading, rows }: { heading: string; rows: Slice[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0)

  return (
    <div>
      <p className="mb-2 font-medium text-foreground text-xs">{heading}</p>
      <ShareBar rows={rows} />
      <ul className="mt-3 space-y-1.5">
        {rows.map((row, index) => (
          <li key={row.id} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-sm"
              style={{ background: seriesColor(index) }}
            />
            <span className="min-w-0 flex-1 truncate text-foreground">
              {row.label}
            </span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {row.count} ({formatPercent(total > 0 ? row.count / total : null)}
              )
            </span>
            <span
              className="w-20 shrink-0 text-end tabular-nums"
              style={{
                color:
                  row.successRate === null
                    ? VIZ.muted
                    : "var(--muted-foreground)",
              }}
            >
              {row.successRate === null
                ? "—"
                : `${formatPercent(row.successRate)} ok`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SourcesModes({
  sources,
  modes,
}: {
  sources: Slice[]
  modes: Slice[]
}) {
  const table = (
    <ChartTable
      rows={[
        ...sources.map((row) => ({ kind: "Source", ...row })),
        ...modes.map((row) => ({ kind: "Analysis mode", ...row })),
      ]}
      rowKey={(row) => `${row.kind}-${row.id}`}
      columns={[
        { key: "kind", header: "Dimension", cell: (r) => r.kind },
        { key: "label", header: "Value", cell: (r) => r.label },
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
      title="Sources & modes"
      subtitle="Where clips come from, and how they get read."
      table={table}
      height={260}
    >
      {sources.length === 0 && modes.length === 0 ? (
        <ChartEmpty message="No runs in this window." />
      ) : (
        // Top-aligned, NOT `justify-between`: the card stretches to match
        // its row neighbour, and spreading two short blocks across that
        // height opens a void between them the size of the data.
        <div className="flex h-full flex-col gap-8">
          <Breakdown heading="Source" rows={sources} />
          <Breakdown heading="Analysis mode" rows={modes} />
        </div>
      )}
    </ChartCard>
  )
}

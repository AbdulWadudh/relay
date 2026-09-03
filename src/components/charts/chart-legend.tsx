"use client"

import { HugeiconsIcon } from "@hugeicons/react"

/**
 * A legend is present for two or more series, always — it is the
 * dependable identity channel, and direct labels only ever supplement it.
 * A SINGLE series gets no legend: there is one colour, and the chart's
 * title already names it.
 *
 * Swatches mirror the mark (a rect for bars and areas, a short stroke for
 * lines). Text wears text tokens, never the series colour: a light
 * categorical hue is illegible as type on the card, and identity comes
 * from the coloured mark beside the label.
 */

export interface LegendItem {
  key: string
  label: string
  color: string
  /** Status series ship an icon as well, so meaning never rests on hue. */
  icon?: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  shape?: "rect" | "line"
}

export function ChartLegend({ items }: { items: LegendItem[] }) {
  if (items.length < 2) return null

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-2">
          {item.icon ? (
            <HugeiconsIcon
              icon={item.icon}
              size={14}
              strokeWidth={2}
              style={{ color: item.color }}
              aria-hidden="true"
            />
          ) : (
            <span
              aria-hidden="true"
              className={
                item.shape === "line"
                  ? "h-0.5 w-4 rounded-full"
                  : "h-3 w-3 rounded-sm"
              }
              style={{ background: item.color }}
            />
          )}
          <span className="text-muted-foreground text-xs">{item.label}</span>
        </li>
      ))}
    </ul>
  )
}

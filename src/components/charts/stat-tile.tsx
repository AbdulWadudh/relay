"use client"

import { CARD_SURFACE } from "@/components/charts/chart-card"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * The figure contract: label, value, optional delta, and a visual.
 *
 * A headline number is a TILE, not a one-bar bar chart — that is the most
 * common way a chart misses its own point.
 *
 * THERE IS NO `hero` VARIANT AND NO ACCENT STRIPE. Data-viz convention
 * wants one display-size figure per view, and success rate had it: 48px,
 * an accent stripe the others lacked, a two-column span, and no chart
 * child, so it was shorter too. Four differences at once stopped reading
 * as emphasis and started reading as a broken card. Giving every tile its
 * own stripe fixed the inconsistency but added five bars of colour that
 * encoded nothing the value did not already say, so they came out too
 * (human decisions 2026-09-04). Hierarchy is carried by ORDER; the number
 * is the tile.
 *
 * No `tabular-nums` on the value, deliberately. Equal-width digits make
 * `121` look loose at display sizes; tabular figures are for columns that
 * align vertically, which these do not.
 */

export function StatTile({
  label,
  value,
  hint,
  delta,
  children,
}: React.PropsWithChildren<{
  label: string
  value: string
  hint?: React.ReactNode
  delta?: { text: string; good: boolean | null }
}>) {
  return (
    <Card
      className={cn("h-full gap-0 px-3 py-4 sm:px-5 sm:py-5", CARD_SURFACE)}
    >
      <p className="font-medium text-muted-foreground text-sm">{label}</p>
      <p className="mt-2 font-heading font-semibold text-3xl text-foreground leading-none">
        {value}
      </p>
      {delta ? (
        <p
          className={cn(
            "mt-2 font-medium text-sm",
            delta.good === null
              ? "text-muted-foreground"
              : delta.good
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-700 dark:text-red-400",
          )}
        >
          {delta.text}
        </p>
      ) : null}
      {hint ? (
        <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
          {hint}
        </p>
      ) : null}
      {/* One reserved height for the visual, whatever it is. A meter is
          three stacked lines and a sparkline is one, so without this the
          sparkline tile sat 20px shorter than its neighbours and the row
          lost its rhythm. */}
      {children ? <div className="mt-3 min-h-[52px]">{children}</div> : null}
    </Card>
  )
}

export function StatTileSkeleton() {
  return (
    <Card
      className={cn("h-full gap-0 px-3 py-4 sm:px-5 sm:py-5", CARD_SURFACE)}
    >
      <div className="h-5 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-9 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-5 w-20 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-28 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-[52px] w-full animate-pulse rounded bg-muted" />
    </Card>
  )
}

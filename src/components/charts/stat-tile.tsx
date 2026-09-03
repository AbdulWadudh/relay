"use client"

import { CARD_SURFACE } from "@/components/charts/chart-card"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * The figure contract: label, value, optional delta, optional sparkline.
 *
 * A headline number is a TILE, not a one-bar bar chart — that is the most
 * common way a chart misses its own point. `hero` renders the one number
 * the dashboard leads with at display size; there is exactly one per view.
 *
 * No `tabular-nums` on the value, deliberately. Equal-width digits make
 * `121` look loose at 48px; tabular figures are for columns that align
 * vertically, which these do not.
 */

export function StatTile({
  label,
  value,
  hint,
  delta,
  hero = false,
  accent,
  children,
}: React.PropsWithChildren<{
  label: string
  value: string
  hint?: React.ReactNode
  delta?: { text: string; good: boolean | null }
  hero?: boolean
  /** A solid colour bar down the start edge — never a translucent tint. */
  accent?: string
}>) {
  return (
    <Card
      className={cn(
        "relative h-full gap-0 overflow-hidden px-3 py-4 sm:px-5 sm:py-5",
        CARD_SURFACE,
      )}
    >
      {accent ? (
        // Inset and rounded, NOT a full-height bar at start-0. Flush and
        // square, it fought the card's rounded corner (the overflow clip
        // sheared its ends) and sat exactly where the card's own border
        // should be, so the tile looked like it had lost its left edge.
        <span
          aria-hidden="true"
          className="absolute inset-y-3 start-0 w-1 rounded-e-full"
          style={{ background: accent }}
        />
      ) : null}
      <p className="font-medium text-muted-foreground text-sm">{label}</p>
      <p
        className={cn(
          "mt-2 font-heading font-semibold text-foreground leading-none",
          hero ? "text-5xl" : "text-3xl",
        )}
      >
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
      {children ? <div className="mt-3">{children}</div> : null}
    </Card>
  )
}

export function StatTileSkeleton({ hero = false }: { hero?: boolean }) {
  return (
    <Card
      className={cn("h-full gap-0 px-3 py-4 sm:px-5 sm:py-5", CARD_SURFACE)}
    >
      <div className="h-5 w-24 animate-pulse rounded bg-muted" />
      <div
        className={cn(
          "mt-2 animate-pulse rounded bg-muted",
          hero ? "h-12 w-32" : "h-9 w-24",
        )}
      />
      <div className="mt-2 h-5 w-20 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-28 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-8 w-full animate-pulse rounded bg-muted" />
    </Card>
  )
}

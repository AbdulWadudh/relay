"use client"

import { Analytics01Icon, Table01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * The frame every chart mounts in: title, caption, legend, and the
 * table-view toggle.
 *
 * The body RESERVES a height that already includes the x-axis band, as a
 * MINIMUM rather than a cap. A container sized to the plot alone gives the
 * card its own tiny nested scrollbar the moment axis labels render, and a
 * height that changes between the skeleton and the loaded chart makes the
 * page dance (RULES.md). The skeleton reserves the same number.
 *
 * `h-full` plus a flexing body is what keeps two cards SHARING A GRID ROW
 * the same height. Without it each card is its own natural height, the
 * grid stretches the wrapper but not the card inside it, and neighbours
 * end at visibly different points — with the shorter one's plot floating
 * above a gap.
 *
 * `caption` is where a chart states what it is NOT saying — sample
 * counts, an axis that is 20x its neighbour's, medians that do not sum.
 * Several charts here are only honest with it, so it sits under the
 * plot rather than in a tooltip nobody opens.
 */

/**
 * The Card primitive's `ring-foreground/10` measures 1.25:1 on white — a
 * boundary that is simply not visible in light mode. zinc-300 (1.48:1) is
 * a hairline rather than a hard outline, and a small elevation shadow does
 * the rest of the separating, which is what reads as depth instead of as a
 * drawn box.
 *
 * An ELEVATION shadow, not a glow (RULES.md). Dropped in dark mode: a
 * shadow on a near-black surface is invisible smudge, and the alpha ring
 * already separates the card there.
 */
export const CARD_SURFACE =
  "shadow-sm ring-zinc-300 dark:shadow-none dark:ring-white/10"

export function ChartCard({
  title,
  subtitle,
  caption,
  legend,
  action,
  table,
  height = 260,
  mobileHeight,
  className,
  children,
}: React.PropsWithChildren<{
  title: string
  subtitle?: React.ReactNode
  caption?: React.ReactNode
  legend?: React.ReactNode
  action?: React.ReactNode
  /** The WCAG-clean twin. Omitted only by tiles that have no plot. */
  table?: React.ReactNode
  height?: number
  /** Taller below `sm`, where side-by-side facets stack into a column. */
  mobileHeight?: number
  className?: string
}>) {
  const [showTable, setShowTable] = useState(false)

  return (
    <Card
      className={cn(
        "h-full gap-0 px-3 py-4 sm:px-5 sm:py-5",
        CARD_SURFACE,
        className,
      )}
      role="group"
      aria-label={title}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-heading font-semibold text-base text-foreground">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-muted-foreground text-sm">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {table ? (
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={showTable}
              onClick={() => setShowTable((shown) => !shown)}
              className="h-9 gap-2 transition-all duration-200 hover:-translate-y-px hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600"
            >
              <HugeiconsIcon
                icon={showTable ? Analytics01Icon : Table01Icon}
                size={16}
                strokeWidth={1.8}
              />
              <span className="hidden sm:inline">
                {showTable ? "Chart" : "Table"}
              </span>
            </Button>
          ) : null}
        </div>
      </div>

      {legend ? <div className="mt-4">{legend}</div> : null}

      {/* The reserved height is a FLOOR, never a cap — a long table or an
          extra provider group grows the card instead of scrolling inside
          it, and `flex-1` lets a short card stretch to match its row
          neighbour. Skeleton and chart reserve the same number, so nothing
          moves while loading. */}
      <div
        className="mt-4 min-h-(--chart-h-sm) min-w-0 flex-1 sm:min-h-(--chart-h)"
        style={
          {
            "--chart-h": `${height}px`,
            "--chart-h-sm": `${mobileHeight ?? height}px`,
          } as React.CSSProperties
        }
      >
        {showTable && table ? table : children}
      </div>

      {caption ? (
        <p className="mt-3 text-muted-foreground text-xs leading-relaxed">
          {caption}
        </p>
      ) : null}
    </Card>
  )
}

/** Same frame, same reserved height, no content — so a loading dashboard
 *  and a loaded one are laid out identically. */
export function ChartCardSkeleton({
  height = 260,
  mobileHeight,
  className,
}: {
  height?: number
  mobileHeight?: number
  className?: string
}) {
  return (
    <Card
      className={cn(
        "h-full gap-0 px-3 py-4 sm:px-5 sm:py-5",
        CARD_SURFACE,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="mt-4 h-5 w-64 animate-pulse rounded bg-muted" />
      <div
        className="mt-4 min-h-(--chart-h-sm) flex-1 animate-pulse rounded-md bg-muted sm:min-h-(--chart-h)"
        style={
          {
            "--chart-h": `${height}px`,
            "--chart-h-sm": `${mobileHeight ?? height}px`,
          } as React.CSSProperties
        }
      />
      <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-muted" />
    </Card>
  )
}

/** What a chart shows when the window genuinely contains nothing — never
 *  an empty axis frame, which reads as a broken chart. */
export function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-md border border-dashed">
      <p className="px-6 text-center text-muted-foreground text-sm">
        {message}
      </p>
    </div>
  )
}

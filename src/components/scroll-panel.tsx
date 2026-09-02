"use client"

import type * as React from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

/**
 * A list that scrolls inside itself instead of scrolling the page.
 *
 * The shared half of the list-page structure (RULES.md, "List pages"). Used
 * with `<ShellContent fill>`, which supplies the fixed-height flex column
 * this expands into: the panel takes every pixel the header, status bar and
 * pager do not, and the rows scroll within it. No height calculation, no
 * magic constant, and correct at any viewport.
 *
 * Two overrides here are load-bearing and neither is obvious.
 *
 * `[&_[data-slot=table-container]]:overflow-visible` — the `Table` primitive
 * wraps itself in a container with `overflow-y-hidden`, which makes THAT div
 * the Y-axis scrollport. A sticky `th` would stick to it and sit motionless
 * while the rows moved behind it. Neutralising that container hands the
 * viewport back to this ScrollArea, which is what the header sticks to.
 *
 * `min-h-0` on both this box and the ScrollArea — a flex item defaults to
 * `min-height:auto` and refuses to shrink below its content, so without it
 * the panel grows to fit every row and pushes the overflow back onto the
 * page.
 */

/**
 * Pins a table's header while its rows scroll under it.
 *
 * On the `th`, not the `thead`. Tailwind's preflight sets `border-collapse:
 * collapse`, and a collapsed table's row borders belong to the table rather
 * than the cell — a sticky `thead` drops its bottom border the moment it
 * detaches and the header bleeds into the first row. The cells carry their
 * own opaque fill and an inset shadow standing in for that border, so the
 * divider survives being stuck.
 */
export const STICKY_TABLE_HEADER =
  "[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-background [&_th]:shadow-[inset_0_-1px_0_var(--border)]"

export function ScrollPanel({
  children,
  className,
  /** A bare scroller for a card list; the bordered box is for tables. */
  bordered = true,
}: React.PropsWithChildren<{ className?: string; bordered?: boolean }>) {
  return (
    /*
      TWO boxes, and the split is the whole trick.

      The outer one CLAIMS the leftover height — everything the status bar
      and the pager do not use — but draws nothing. The inner one is sized
      by its content and merely capped at that leftover, so a six-row table
      is six rows tall and a full page scrolls.

      One box cannot do both. `flex-1` alone always fills, which put 755px
      of empty bordered space under the Vault's six credentials. `max-h-full`
      alone caps against the whole column, siblings included, so a long list
      overflows by the height of the status bar and pager and pushes the
      pager off-screen. Claiming the space and consuming it have to be
      separate jobs.
    */
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div
        className={cn(
          "flex max-h-full min-h-0 flex-col overflow-hidden",
          bordered && "rounded-lg border",
        )}
      >
        <ScrollArea className="min-h-0 flex-1 [&_[data-slot=table-container]]:overflow-visible">
          {children}
        </ScrollArea>
      </div>
    </div>
  )
}

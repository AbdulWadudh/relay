"use client"

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  DragDropVerticalIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  type ProviderIconWithVariant,
  providerAccent,
  providerIcon,
  providerIconVariant,
  providerLabel,
} from "@/lib/providers"
import { cn } from "@/lib/utils"

/**
 * One provider in the extraction-priority list.
 *
 * THE WHOLE ROW is the drag handle — dnd-kit's listeners are spread onto
 * the <li> by the parent, not onto a grip button. The grip glyph stays as
 * a visual affordance only (aria-hidden, not focusable), because a control
 * that looks like the only drag target while the entire row is draggable
 * misleads more than it helps.
 *
 * Every row carries its provider's OWN accent (RULES.md: no single global
 * accent) as a solid fill, with both light and dark values — the dark
 * highlight is -900, since -950 is invisible on a near-black card.
 */

interface ProviderOrderRowProps {
  id: string
  index: number
  total: number
  onMove: (from: number, to: number) => void
  isDragging: boolean
  style?: React.CSSProperties
  /** dnd-kit attributes + listeners, spread onto the row itself. */
  dragProps: React.HTMLAttributes<HTMLLIElement>
}

export const ProviderOrderRow = React.forwardRef<
  HTMLLIElement,
  ProviderOrderRowProps
>(function ProviderOrderRow(
  { id, index, total, onMove, isDragging, style, dragProps },
  ref,
) {
  const accent = providerAccent(id)
  const Icon = providerIcon(id) as ProviderIconWithVariant | null
  const variant = providerIconVariant(id)
  const label = providerLabel(id)
  const first = index === 0
  const last = index === total - 1

  // The arrow buttons live inside the draggable row, so their pointer
  // events must not reach the drag sensor or a click reads as a drag start.
  const stopDrag = (event: React.PointerEvent) => event.stopPropagation()

  return (
    <li
      ref={ref}
      style={style}
      {...dragProps}
      className={cn(
        "flex touch-none items-center gap-3 rounded-lg border border-border bg-card px-4 py-3",
        "cursor-grab transition-colors duration-150 active:cursor-grabbing",
        accent.hover,
        // Lifted while dragging. Shadow/border only — no scale, which
        // re-rasterises text and reads as a blur.
        isDragging && "relative z-10 border-primary shadow-lg",
      )}
    >
      <HugeiconsIcon
        icon={DragDropVerticalIcon}
        className="size-5 shrink-0 text-muted-foreground"
        aria-hidden
      />

      {Icon ? (
        <Icon
          className={cn("size-5 shrink-0", variant ? accent.chip : undefined)}
          variant={variant}
          aria-hidden
        />
      ) : null}

      <span className="min-w-0 flex-1 truncate font-medium text-sm">
        {label}
      </span>

      {first ? (
        <span className="shrink-0 rounded-md bg-primary px-2 py-1 font-medium text-primary-foreground text-xs">
          Tried first
        </span>
      ) : null}

      {/* WCAG 2.2 AA: drag alone is not an accessible reorder control.
          These are the single-pointer + keyboard alternative. */}
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 hover:-translate-y-px hover:bg-zinc-200 dark:hover:bg-zinc-700"
          disabled={first}
          onPointerDown={stopDrag}
          onClick={() => onMove(index, index - 1)}
          aria-label={`Move ${label} up`}
        >
          <HugeiconsIcon icon={ArrowUp01Icon} className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 hover:translate-y-px hover:bg-zinc-200 dark:hover:bg-zinc-700"
          disabled={last}
          onPointerDown={stopDrag}
          onClick={() => onMove(index, index + 1)}
          aria-label={`Move ${label} down`}
        >
          <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" />
        </Button>
      </div>
    </li>
  )
})

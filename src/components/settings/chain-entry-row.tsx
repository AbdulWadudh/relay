"use client"

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  DragDropVerticalIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"
import { ProviderMark } from "@/components/provider-mark"
import { Button } from "@/components/ui/button"
import { providerAccent } from "@/lib/provider-styles"
import { providerLabel } from "@/lib/providers"
import { cn } from "@/lib/utils"

/**
 * One ACCOUNT in the extraction chain.
 *
 * THE WHOLE ROW is the drag handle — dnd-kit's listeners are spread onto
 * the <li> by the parent, not onto a grip button. The grip glyph stays as
 * a visual affordance only (aria-hidden, not focusable), because a control
 * that looks like the only drag target while the entire row is draggable
 * misleads more than it helps.
 *
 * Every row carries its provider's OWN accent (RULES.md: no single global
 * accent) as a solid fill, with both light and dark values.
 */

interface ChainEntryRowProps {
  provider: string
  /** The account this row is, when the provider holds a credential. */
  account: string | null
  /** Switched off in the vault: still ordered here, but never reached. */
  active: boolean
  /** First of the ACTIVE rows — not necessarily the first row. */
  triedFirst: boolean
  index: number
  total: number
  onMove: (from: number, to: number) => void
  isDragging: boolean
  style?: React.CSSProperties
  /** dnd-kit attributes + listeners, spread onto the row itself. */
  dragProps: React.HTMLAttributes<HTMLLIElement>
}

export const ChainEntryRow = React.forwardRef<
  HTMLLIElement,
  ChainEntryRowProps
>(function ChainEntryRow(
  {
    provider,
    account,
    active,
    triedFirst,
    index,
    total,
    onMove,
    isDragging,
    style,
    dragProps,
  },
  ref,
) {
  const accent = providerAccent(provider)
  const label = providerLabel(provider)
  const first = index === 0
  const last = index === total - 1
  // Names the row for a screen reader: two rows can share a provider.
  const name = account ? `${label} — ${account}` : label

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
        "cursor-grab transition-all duration-150 active:cursor-grabbing",
        accent.hover,
        // Still ordered, still draggable — so you can park it where you
        // want it before switching it back on — but visibly out of play.
        !active && "opacity-55",
        // Lifted while dragging. Shadow/border only — no scale, which
        // re-rasterises text and reads as a blur.
        isDragging && "relative z-10 border-primary shadow-lg",
      )}
    >
      <HugeiconsIcon
        icon={DragDropVerticalIcon}
        className="hidden size-5 shrink-0 text-muted-foreground sm:block"
        aria-hidden
      />

      <ProviderMark
        provider={provider}
        className={cn("size-5", !active && "grayscale")}
      />

      {/* Provider and account stack on a phone: side by side, a long
            email truncated the provider name away entirely. */}
      <div className="grid min-w-0 flex-1 leading-tight">
        <span className="truncate font-medium text-sm">{label}</span>
        {account ? (
          <span className="truncate text-muted-foreground text-xs">
            {account}
          </span>
        ) : null}
      </div>

      {/* "Off" is never hidden — a row that looks skippable but is not
          explained is worse than a cramped one. "Tried first" is, because
          at 380px it squeezed the account name away and the top position
          already carries its meaning. */}
      {active ? (
        triedFirst ? (
          <span className="hidden shrink-0 rounded-md bg-primary px-2 py-1 font-medium text-primary-foreground text-xs sm:inline-block">
            Tried first
          </span>
        ) : null
      ) : (
        <span className="shrink-0 rounded-md border border-border px-2 py-1 font-medium text-muted-foreground text-xs uppercase">
          Off
        </span>
      )}

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
          aria-label={`Move ${name} up`}
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
          aria-label={`Move ${name} down`}
        >
          <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" />
        </Button>
      </div>
    </li>
  )
})

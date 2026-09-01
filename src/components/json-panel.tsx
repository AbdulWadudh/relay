"use client"

import { CollapseIcon, ExpandIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { CollapseState, CopyFunction } from "json-edit-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/toast"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * The chrome around a JSON tree — toolbar, capped scroll, copy feedback —
 * split out of json-view.tsx to respect the 250-line cap (RULES.md).
 */

/** Tall enough to read a schema in, short enough to keep the page usable. */
const DEFAULT_MAX_HEIGHT = "24rem"

/**
 * The library applies `externalTriggers` from a `useEffect` keyed on the
 * OBJECT IDENTITY, so a fresh object is minted per press — otherwise
 * pressing the same button twice would be a no-op.
 */
export function useCollapseAll() {
  const [trigger, setTrigger] = React.useState<
    { collapse: CollapseState } | undefined
  >(undefined)

  const set = React.useCallback((collapsed: boolean) => {
    // An empty path is the root; `includeChildren` cascades to every
    // descendant, which is what makes this "all" rather than "the root".
    setTrigger({ collapse: { path: [], collapsed, includeChildren: true } })
  }, [])

  return { trigger, expandAll: () => set(false), collapseAll: () => set(true) }
}

/** On a deep tree it is otherwise not obvious which node was copied. */
export const onCopy: CopyFunction = ({ success, errorMessage, key, type }) => {
  if (!success) {
    toast.add({
      type: "error",
      title: "Could not copy",
      description: errorMessage ?? undefined,
    })
    return
  }
  toast.add({
    type: "success",
    title: type === "path" ? "Path copied" : "Value copied",
    description: key === "" ? undefined : String(key),
  })
}

function ToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon: typeof ExpandIcon
  label: string
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={label}
            onClick={onClick}
            className="transition-all duration-200 hover:-translate-y-px hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600"
          />
        }
      >
        <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-4" />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * The bordered shell both surfaces share: a fixed toolbar row with the
 * controls pinned RIGHT, then the tree in its own capped ScrollArea,
 * padded away from the border rather than butted against it.
 */
export function JsonPanel({
  filterLabel,
  search,
  onSearch,
  maxHeight = DEFAULT_MAX_HEIGHT,
  invalid,
  className,
  children,
  onExpandAll,
  onCollapseAll,
}: React.PropsWithChildren<{
  filterLabel?: string
  search?: string
  onSearch?: (value: string) => void
  maxHeight?: string
  invalid?: boolean
  className?: string
  onExpandAll: () => void
  onCollapseAll: () => void
}>) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      {onSearch ? (
        <Input
          value={search ?? ""}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={filterLabel ?? "Filter"}
          aria-label={filterLabel ?? "Filter JSON"}
          className="h-8 max-w-xs"
        />
      ) : null}
      {/* The cap goes on the ScrollArea's VIEWPORT, not this box and not
          the ScrollArea root: Base UI sizes the viewport `h-full`, and
          that percentage does not resolve against a flex-derived height,
          so the tree was clipped with no scrollbar. */}
      <div
        className={cn(
          "relative min-w-0 overflow-hidden rounded-md border bg-input/20 dark:bg-input/30",
          invalid && "border-destructive",
        )}
      >
        {/* Siblings of the ScrollArea, not inside it, so they stay
            pinned while the tree scrolls under them. */}
        <div className="absolute end-2 top-2 z-10 flex items-center gap-1.5">
          <ToolbarButton
            icon={ExpandIcon}
            label="Expand all"
            onClick={onExpandAll}
          />
          <ToolbarButton
            icon={CollapseIcon}
            label="Collapse all"
            onClick={onCollapseAll}
          />
        </div>
        <ScrollArea
          style={{ "--json-max-h": maxHeight } as React.CSSProperties}
          className="[&_[data-slot=scroll-area-viewport]]:max-h-[var(--json-max-h)]"
        >
          {/* pe-24 keeps a long first line from running under the
              floating controls. */}
          <div className="min-w-0 px-3 py-3 pe-24">{children}</div>
        </ScrollArea>
      </div>
    </div>
  )
}

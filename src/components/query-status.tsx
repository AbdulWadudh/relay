"use client"

import { RefreshIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

/**
 * Freshness strip for a cached list: last-updated time, background
 * refetches, failed-refetch warnings, and a manual refresh once stale.
 *
 * Every state occupies the same geometry — fixed `h-8` row, and a
 * skeleton of the timestamp's own size before it can be rendered — so the
 * table below never changes position. The list skeletons render
 * `QueryStatusBarSkeleton`, which matches this row exactly.
 */

const STATUS_ROW = "flex h-8 items-center justify-end gap-2 text-xs"
// Only the elapsed time is unknown up front; "Updated" is static and
// renders immediately (RULES.md: loaders cover dynamic values, not
// static copy).
const TIME_SKELETON = "h-3 w-24"

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

function updatedAgo(timestamp: number): string {
  const seconds = Math.round((timestamp - Date.now()) / 1000)
  if (seconds > -60) return relative.format(Math.min(seconds, -1), "second")
  const minutes = Math.round(seconds / 60)
  if (minutes > -60) return relative.format(minutes, "minute")
  return relative.format(Math.round(minutes / 60), "hour")
}

/** "Updated" stays put; only the elapsed time swaps in when known. */
function UpdatedLabel({ time }: { time?: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span>Updated</span>
      {time ? <span>{time}</span> : <Skeleton className={TIME_SKELETON} />}
    </span>
  )
}

/**
 * Loading twin of QueryStatusBar — identical height and placement. Rows
 * haven't arrived yet here, so it spins rather than claiming a last-
 * updated time it doesn't have.
 */
export function QueryStatusBarSkeleton({ entity }: { entity: string }) {
  return (
    <div className={STATUS_ROW}>
      <span className="flex items-center gap-2 text-muted-foreground">
        <Spinner className="size-3.5" />
        Loading {entity}…
      </span>
      {/* Reserves the refresh button's footprint, which is always present
          once loaded, so the row does not shift. */}
      <Skeleton className="size-8 rounded-md" />
    </div>
  )
}

export interface QueryStatusBarProps {
  entity: string
  isFetching: boolean
  isStale: boolean
  isError: boolean
  updatedAt: number
  onRefresh: () => void
}

export function QueryStatusBar({
  entity,
  isFetching,
  isStale,
  isError,
  updatedAt,
  onRefresh,
}: QueryStatusBarProps) {
  // A relative timestamp differs between the server render and hydration,
  // so it can only be produced on the client. The skeleton stands in until
  // then, keeping the row the same size rather than leaving a gap.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  // Always offered, on every list backed by the database — a refresh that
  // only appears once the data happens to be stale is a control the user
  // cannot rely on finding. Disabled (not removed) while a fetch is in
  // flight so the row's geometry never changes.

  return (
    <div className={STATUS_ROW}>
      {isFetching ? (
        <span className="flex items-center gap-2 text-muted-foreground">
          <Spinner className="size-3.5" />
          Refreshing {entity}…
        </span>
      ) : isError ? (
        <span className="font-medium text-red-600 dark:text-red-400">
          Couldn't refresh — showing the last loaded {entity}.
        </span>
      ) : (
        <span className={cn(isStale && "italic")}>
          <UpdatedLabel
            time={mounted && updatedAt > 0 ? updatedAgo(updatedAt) : undefined}
          />
        </span>
      )}

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onRefresh}
        disabled={isFetching}
        aria-label={`Refresh ${entity}`}
        className="transition-all duration-200 hover:scale-110 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600"
      >
        <HugeiconsIcon icon={RefreshIcon} strokeWidth={1.5} />
      </Button>
    </div>
  )
}

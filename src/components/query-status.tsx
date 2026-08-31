"use client"

import { RefreshIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

/**
 * Freshness strip for a cached list: reports background refetches, warns
 * when a refetch failed but cached rows are still on screen, and offers a
 * manual refresh once the data has gone stale.
 */

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

function updatedAgo(timestamp: number): string {
  const seconds = Math.round((timestamp - Date.now()) / 1000)
  if (seconds > -60) return relative.format(Math.min(seconds, -1), "second")
  const minutes = Math.round(seconds / 60)
  if (minutes > -60) return relative.format(minutes, "minute")
  return relative.format(Math.round(minutes / 60), "hour")
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
  // Relative timestamps differ between the server render and hydration,
  // so hold them back until the client has mounted.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const showRefresh = !isFetching && (isStale || isError)

  return (
    <div className="flex h-8 items-center justify-end gap-2 text-xs">
      {isFetching ? (
        <span className="flex items-center gap-2 text-muted-foreground">
          <Spinner className="size-3.5" />
          Refreshing {entity}…
        </span>
      ) : isError ? (
        <span className="font-medium text-red-600 dark:text-red-400">
          Couldn't refresh — showing the last loaded {entity}.
        </span>
      ) : mounted && updatedAt > 0 ? (
        <span className={cn("text-muted-foreground", isStale && "italic")}>
          Updated {updatedAgo(updatedAt)}
        </span>
      ) : null}

      {showRefresh ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRefresh}
          aria-label={`Refresh ${entity}`}
          className="transition-all duration-200 hover:scale-110 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600"
        >
          <HugeiconsIcon icon={RefreshIcon} strokeWidth={1.5} />
        </Button>
      ) : null}
    </div>
  )
}

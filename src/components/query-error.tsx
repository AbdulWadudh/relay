"use client"

import { Alert02Icon, RefreshIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ApiError } from "@/lib/query/http"

/**
 * Terminal error state — shown only when a query failed with nothing
 * cached to fall back on. If stale rows exist, the list keeps rendering
 * them and surfaces the failure through QueryStatusBar instead.
 */
export function QueryErrorState({
  entity,
  error,
  onRetry,
}: {
  entity: string
  error: unknown
  onRetry: () => void
}) {
  const unauthorized = error instanceof ApiError && error.status === 401
  const message =
    error instanceof Error ? error.message : `Could not load ${entity}.`

  return (
    <Empty className="fade-in zoom-in-95 animate-in rounded-lg border border-red-600 fill-mode-both">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-red-600 text-white">
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={1.5} />
        </EmptyMedia>
        <EmptyTitle>Couldn't load {entity}</EmptyTitle>
        <EmptyDescription>
          {unauthorized
            ? "Your session expired. Sign in again to continue."
            : message}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          onClick={onRetry}
          className="transition-all duration-200 hover:-translate-y-px"
        >
          <HugeiconsIcon icon={RefreshIcon} data-icon="inline-start" />
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  )
}

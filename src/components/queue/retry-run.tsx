"use client"

import { RefreshIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useCreateRun } from "@/lib/query/runs"
import type { RunSummary } from "@/lib/runs"

/**
 * Run the same source again.
 *
 * A NEW run through `POST /relay/process`, not a reset of this one. Two
 * reasons: the existing record is evidence — the failure message, the
 * per-stage timings and whatever was published are what you compare the
 * retry against, and resetting in place destroys exactly that. And the
 * create path already owns URL parsing, the per-user queue budget and
 * deduplication, so re-entering through it means a retry cannot bypass a
 * limit that a first submission has to respect.
 *
 * The agent choice rides along, so a run pinned to a specific agent
 * retries against that agent rather than silently re-routing.
 *
 * Offered only on a FINISHED run (`done` / `failed`). Retrying something
 * still in flight would not cancel it — it would just queue a duplicate of
 * work already running, and bill for it twice.
 */

const TERMINAL: ReadonlySet<RunSummary["status"]> = new Set(["done", "failed"])

export function canRetry(status: RunSummary["status"]): boolean {
  return TERMINAL.has(status)
}

export function RetryRun({
  run,
  variant = "icon",
}: {
  run: Pick<RunSummary, "sourceUrl" | "agentId" | "status" | "sourceLabel">
  /** `icon` in a table row; `button` on the detail page, which has room. */
  variant?: "icon" | "button"
}) {
  const createRun = useCreateRun()

  function retry() {
    if (createRun.isPending) return
    createRun.mutate(
      { url: run.sourceUrl, agentId: run.agentId ?? undefined },
      {
        onSuccess: () =>
          toast.add({
            type: "success",
            title: "Run started again",
            description: `A new run was queued for this ${run.sourceLabel}. The original stays in the list.`,
          }),
        onError: (error) =>
          toast.add({
            type: "error",
            title: "Could not start the run again",
            // The server's messages name the fix (bad URL, budget reached),
            // so they are surfaced as-is.
            description:
              error instanceof Error ? error.message : "Try again in a moment.",
          }),
      },
    )
  }

  if (variant === "button") {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={retry}
        disabled={createRun.isPending}
        className="transition-all duration-200 hover:border-sky-600 hover:text-sky-700 active:scale-[0.98] dark:hover:text-sky-300"
      >
        {createRun.isPending ? (
          <Spinner />
        ) : (
          <HugeiconsIcon icon={RefreshIcon} size={16} strokeWidth={2} />
        )}
        Run again
      </Button>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={retry}
            disabled={createRun.isPending}
            className="transition-all duration-200 hover:-translate-y-px hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600"
            aria-label={`Run this ${run.sourceLabel} again`}
          />
        }
      >
        {createRun.isPending ? (
          <Spinner />
        ) : (
          <HugeiconsIcon icon={RefreshIcon} strokeWidth={1.5} />
        )}
      </TooltipTrigger>
      <TooltipContent>Run again</TooltipContent>
    </Tooltip>
  )
}

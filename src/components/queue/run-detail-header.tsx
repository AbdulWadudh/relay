"use client"

import { ArrowLeft02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

import { ExternalLink } from "@/components/queue/linkify"
import { canRetry, RetryRun } from "@/components/queue/retry-run"
import { RunStatusBadge } from "@/components/queue/run-status-badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { RunStatus } from "@/lib/run-status"
import type { RunSummary } from "@/lib/runs"

/** Split from run-detail.tsx to keep it under the 250-line cap. */
export function RunDetailHeader({
  status,
  title,
  sourceUrl,
  run,
}: {
  status: RunStatus
  title: string
  sourceUrl: string
  /** Enough of the run to resubmit it; see RetryRun. */
  run: Pick<
    RunSummary,
    "sourceUrl" | "agentId" | "analysisMode" | "status" | "sourceLabel"
  >
}) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Inline back affordance — the header's button sits far top-right,
            away from where the eye is reading. */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Back to queue"
                // size-6 matches the badges beside it, and is the WCAG 2.2
                // minimum pointer target; the default icon-sm towered over
                // a 20px badge.
                className="size-6 transition-all duration-200 hover:-translate-y-px hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600"
                // Renders an anchor, not a <button>; Base UI has to be
                // told or it logs an accessibility error.
                nativeButton={false}
                render={<Link href="/runs" />}
              />
            }
          >
            <HugeiconsIcon
              icon={ArrowLeft02Icon}
              strokeWidth={2}
              className="size-3.5"
            />
          </TooltipTrigger>
          <TooltipContent>Back to queue</TooltipContent>
        </Tooltip>
        <RunStatusBadge status={status} className="h-6" />
        {/* Pushed to the end of the row: the detail page is where a failed
            run is actually read, so the way to run it again belongs next to
            the verdict rather than back on the list. */}
        {canRetry(status) ? (
          <div className="ms-auto">
            <RetryRun run={run} variant="button" />
          </div>
        ) : null}
      </div>
      <h1 className="font-heading font-semibold text-2xl leading-tight [overflow-wrap:anywhere]">
        {title}
      </h1>
      {/* Full URL as the label: on the detail page the exact video identity
          matters more than a tidy hostname. */}
      <ExternalLink
        href={sourceUrl}
        label={sourceUrl}
        className="w-fit font-mono text-xs"
      />
    </header>
  )
}

"use client"

import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { RunLogLines } from "@/components/queue/run-log-lines"
import type { RunLogLine } from "@/lib/query/runs"
import { cn } from "@/lib/utils"

/**
 * One stage's log lines, behind a disclosure on the stage rail.
 *
 * COLLAPSED BY DEFAULT, and that is the design rather than a default. A
 * run's own status and timings already answer "what happened"; logs answer
 * "why", which is a question only asked when something looks wrong. Open
 * by default would bury a five-stage rail under hundreds of lines and make
 * the common case worse to serve the rare one (progressive disclosure).
 *
 * The fetch is gated on the same disclosure — see `useRunLogs` — so a page
 * view that never expands a stage costs no log traffic at all.
 */

export function RunStageLogs({
  lines,
  expanded,
  onToggle,
  loading,
  source,
  panelId,
}: {
  lines: RunLogLine[]
  expanded: boolean
  onToggle: () => void
  loading: boolean
  source: "live" | "history" | undefined
  /** Ties the button to the region it controls, for screen readers. */
  panelId: string
}) {
  const count = lines.length

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={cn(
          "-mx-1 flex cursor-pointer items-center gap-1 rounded px-1 py-0.5",
          "text-muted-foreground text-xs",
          "transition-colors duration-150 hover:text-foreground",
          "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1",
        )}
      >
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          aria-hidden
          className={cn(
            "size-3.5 transition-transform duration-200 ease-out",
            expanded ? "rotate-0" : "-rotate-90",
          )}
        />
        {/* The label carries the count so the disclosure is worth opening
            (or worth skipping) before it is opened. */}
        <span>
          {expanded ? "Hide logs" : "Logs"}
          {count > 0 ? (
            <span className="ml-1 tabular-nums">({count})</span>
          ) : null}
        </span>
      </button>

      {/*
        `grid-rows-[0fr]` -> `[1fr]` animates the collapse without a
        hardcoded max-height that would clip a long stage or leave a gap
        after a short one.

        Correctness never depends on the transition finishing: `hidden`
        follows `expanded` directly, so a user who toggles rapidly always
        lands in the right final state instead of waiting on a
        transitionend that may never fire (cancellable state transitions).
      */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div
            id={panelId}
            hidden={!expanded}
            /* `bg-card`, not a fixed dark slab: the border already separates
               this from the page, and a theme token cannot drift out of step
               with the text inside it the way the hardcoded one did. */
            className="mt-1.5 rounded-md border bg-card p-2"
          >
            {loading && count === 0 ? (
              <p className="px-1 py-2 text-muted-foreground text-xs">
                Loading logs…
              </p>
            ) : count === 0 ? (
              /* Says WHY it is empty. "No logs" on a run that simply aged
                 out of the live window reads as a broken pipeline. */
              <p className="px-1 py-2 text-muted-foreground text-xs">
                {source === "history"
                  ? "No logs retained for this stage."
                  : "This stage produced no log output."}
              </p>
            ) : (
              /* Scrolls INTERNALLY: the app is a fixed-viewport shell, so
                 an expanded stage must not grow the page. */
              <RunLogLines lines={lines} className="max-h-64" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

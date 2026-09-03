"use client"

import * as React from "react"

import { RunLogLines } from "@/components/queue/run-log-lines"
import { Button } from "@/components/ui/button"
import { useRunLogs } from "@/lib/query/runs"
import { isTerminal, type RunStatus } from "@/lib/run-status"
import { cn } from "@/lib/utils"

/**
 * EVERY line the run produced, in the order it produced them.
 *
 * The stage rail's disclosures answer "what did this step say"; this
 * answers "what happened, in order" — the question you ask when a failure
 * spans steps, or when a step you cannot see logged the reason.
 *
 * It also shows lines the rail structurally CANNOT. The rail buckets by
 * `line.stage` and renders only the five `PIPELINE_STAGES`, so anything
 * logged with `stage: ""` — outside a stage — or under a stage the rail
 * does not draw was fetched, bucketed and then silently dropped.
 *
 * One request, shared with the rail through the same query key, so opening
 * both costs nothing extra.
 */

const LEVELS = ["error", "warn", "info"] as const
type Level = (typeof LEVELS)[number]

/** Cheapest useful filter: severity, not free text. */
const RANK: Record<string, number> = {
  fatal: 0,
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 3,
}

export function RunLogStream({
  runId,
  status,
}: {
  runId: string
  status: RunStatus
}) {
  const [open, setOpen] = React.useState(false)
  const [floor, setFloor] = React.useState<Level>("info")

  const { data, isFetching } = useRunLogs(runId, {
    enabled: open,
    live: !isTerminal(status),
  })

  const all = data?.lines ?? []
  const lines = all.filter(
    (line) => (RANK[line.level] ?? 2) <= (RANK[floor] ?? 2),
  )

  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-2 p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen((current) => !current)}
          className="transition-all duration-200 hover:-translate-y-px"
        >
          {open ? "Hide full log" : "Show full log"}
        </Button>

        {open ? (
          <>
            <span className="text-muted-foreground text-xs tabular-nums">
              {lines.length} of {all.length} lines
              {isFetching && all.length === 0 ? " · loading" : ""}
              {data?.source === "history" ? " · from history" : ""}
            </span>
            {/* Severity FLOOR, not a set of toggles: "warnings and worse"
                is the question an operator actually asks. */}
            <div className="ml-auto flex items-center gap-1">
              {LEVELS.map((level) => (
                <Button
                  key={level}
                  variant="ghost"
                  size="sm"
                  onClick={() => setFloor(level)}
                  aria-pressed={floor === level}
                  className={cn(
                    "h-7 px-2 text-xs capitalize transition-colors duration-200",
                    floor === level
                      ? "bg-sky-600 text-white hover:bg-sky-600 dark:hover:bg-sky-600"
                      : "text-muted-foreground",
                  )}
                >
                  {level === "info" ? "All" : `${level}+`}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <span className="text-muted-foreground text-xs">
            Every line this run produced, in order.
          </span>
        )}
      </div>

      {open ? (
        <div className="border-t p-2">
          {isFetching && all.length === 0 ? (
            <p className="px-1 py-2 text-muted-foreground text-xs">
              Loading logs…
            </p>
          ) : all.length === 0 ? (
            // Says WHY it is empty: a run that simply aged out of the live
            // window reads as a broken pipeline otherwise.
            <p className="px-1 py-2 text-muted-foreground text-xs">
              {data?.source === "history"
                ? "No logs retained for this run."
                : "This run produced no log output."}
            </p>
          ) : lines.length === 0 ? (
            <p className="px-1 py-2 text-muted-foreground text-xs">
              No lines at this level or above.
            </p>
          ) : (
            /* Scrolls INTERNALLY: the app is a fixed-viewport shell, so an
               expanded log must not grow the page. Taller than a stage
               disclosure because this is the whole run. */
            <RunLogLines lines={lines} showStage className="max-h-96" />
          )}
        </div>
      ) : null}
    </div>
  )
}

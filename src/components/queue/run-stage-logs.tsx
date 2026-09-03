"use client"

import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

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

/**
 * Level drives colour, but the level NAME is always rendered too: meaning
 * is never carried by colour alone. Solid foreground colours only, per
 * RULES.md.
 *
 * PAIRED `dark:` VARIANTS, not bare `-400` shades. This panel used to be a
 * hardcoded `bg-zinc-950` slab — the app's only fixed-dark surface outside
 * the modal scrims — with every tone inside picked to read against that
 * black. In LIGHT mode the slab stayed black while the empty-state text,
 * which correctly used `text-muted-foreground`, flipped to a dark grey and
 * became unreadable on it. The panel is now `bg-card`, so it follows the
 * theme, and every `-400` here needs a `-700` companion for the light
 * surface (RULES.md § UI, "Light mode contrast").
 *
 * Measured against the real token values in both themes: the weakest pair
 * in this panel is 4.83:1 (`--muted-foreground` on light `--card`) and the
 * weakest accent is 5.05:1 (amber-700, same surface), so all of them clear
 * WCAG AA 4.5 for the 11px monospace this renders at. `bg-muted` was tried
 * first and rejected: it put that metadata pair at 4.39:1.
 */
const LEVEL_TONE: Record<string, string> = {
  error: "text-red-700 dark:text-red-400",
  fatal: "text-red-700 dark:text-red-400",
  warn: "text-amber-700 dark:text-amber-400",
  info: "text-sky-700 dark:text-sky-400",
  // No accent to carry, so these take the same token as the metadata.
  debug: "text-muted-foreground",
  trace: "text-muted-foreground",
}

/**
 * Built ONCE at module scope, not per line.
 *
 * Constructing an `Intl.DateTimeFormat` is the expensive part; formatting
 * with an existing one is cheap. A panel can hold up to
 * `RUN_LOG_MAX_LINES` (500) rows and re-renders on every poll while a run
 * is live, so a formatter built inside the render would be rebuilt
 * thousands of times a minute. Same module-scope pattern as
 * `runs-table.tsx` and `run-detail.tsx`.
 *
 * `h23` pins 24-hour output regardless of the viewer's locale preference —
 * a log timestamp with an am/pm suffix is harder to scan and wider.
 * `fractionalSecondDigits` gets the milliseconds that matter when two
 * pipeline steps land in the same second.
 */
const timeFormat = new Intl.DateTimeFormat("en", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  fractionalSecondDigits: 3,
  hourCycle: "h23",
})

/**
 * The structured half of a log line, flattened to `key=value`.
 *
 * Values are already redacted server-side (`redactLogValue`), so a
 * sensitive field arrives here as the literal string "[REDACTED]" and is
 * rendered as such — visible proof to an operator that something was
 * withheld, rather than a silently missing field.
 */
function formatFields(fields: Record<string, unknown>): string {
  return Object.entries(fields)
    .map(([key, value]) => {
      const text =
        typeof value === "string"
          ? value
          : (JSON.stringify(value) ?? String(value))
      return `${key}=${text}`
    })
    .join("  ")
}

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
              <ol className="max-h-64 overflow-y-auto font-mono text-[11px] leading-relaxed">
                {lines.map((line) => (
                  <li key={line.id} className="flex gap-2 px-1 py-px">
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {timeFormat.format(line.at)}
                    </span>
                    <span
                      className={cn(
                        "w-10 shrink-0 uppercase",
                        LEVEL_TONE[line.level] ?? "text-muted-foreground",
                      )}
                    >
                      {line.level}
                    </span>
                    {/* `break-words` + `min-w-0`: log lines carry video
                        ids, file paths and URLs, which must reflow rather
                        than force the panel to scroll sideways. */}
                    <span className="wrap-break-word min-w-0 text-foreground">
                      {line.message}
                      {line.fields ? (
                        <span className="ml-2 text-muted-foreground">
                          {formatFields(line.fields)}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

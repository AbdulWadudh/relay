"use client"

import type { RunLogLine } from "@/lib/query/runs"
import { cn } from "@/lib/utils"

/**
 * One list of log lines, shared by the per-stage disclosure and the
 * whole-run stream.
 *
 * Extracted so the two views cannot drift: a timestamp that formatted
 * differently, or a level that took a different colour, depending on which
 * panel you opened would be a bug nobody would think to look for.
 */

/**
 * Level drives colour, but the level NAME is always rendered too: meaning
 * is never carried by colour alone. Solid foreground colours only, per
 * RULES.md.
 *
 * PAIRED `dark:` VARIANTS, not bare `-400` shades. Measured against the
 * real token values in both themes: the weakest pair here is 4.83:1
 * (`--muted-foreground` on light `--card`) and the weakest accent is
 * 5.05:1 (amber-700, same surface), so all of them clear WCAG AA 4.5 for
 * the 11px monospace this renders at. `bg-muted` was tried first and
 * rejected: it put that metadata pair at 4.39:1.
 */
export const LEVEL_TONE: Record<string, string> = {
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
 * thousands of times a minute.
 *
 * `h23` pins 24-hour output regardless of the viewer's locale preference —
 * a log timestamp with an am/pm suffix is harder to scan and wider.
 * `fractionalSecondDigits` gets the milliseconds that matter when two
 * pipeline steps land in the same second.
 */
export const timeFormat = new Intl.DateTimeFormat("en", {
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
export function formatFields(fields: Record<string, unknown>): string {
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

export function RunLogLines({
  lines,
  /** Prefixes each row with its stage, for the whole-run view. */
  showStage = false,
  className,
}: {
  lines: RunLogLine[]
  showStage?: boolean
  className?: string
}) {
  return (
    <ol
      className={cn(
        "overflow-y-auto font-mono text-[11px] leading-relaxed",
        className,
      )}
    >
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
          {showStage ? (
            // A line logged outside any stage carries "", which is exactly
            // the case the per-stage view could never show.
            <span className="w-20 shrink-0 truncate text-muted-foreground">
              {line.stage || "—"}
            </span>
          ) : null}
          {/* `break-words` + `min-w-0`: log lines carry video ids, file
              paths and URLs, which must reflow rather than force the panel
              to scroll sideways. */}
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
  )
}

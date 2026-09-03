/**
 * Chart colour roles and value formatters.
 *
 * Colours are read as CSS custom properties (src/app/globals.css), never
 * as literals here — that is what lets light and dark swap in one place
 * and keeps the validated palette in a single file. Every function below
 * returns a `var(--viz-*)` reference, so nothing in a chart component
 * ever names a hex.
 */

/** Categorical slots, in the fixed order the palette was validated in. */
const SERIES_SLOTS = 8

/**
 * Slot `index` (0-based), assigned in order and NEVER cycled. Past the
 * eighth slot a series takes the de-emphasis grey instead of a wrapped
 * hue: a generated ninth colour is indistinguishable from an existing one
 * under colour-vision deficiency, so callers must fold their tail into
 * "Other" rather than rely on this fallback.
 */
export function seriesColor(index: number): string {
  return index < SERIES_SLOTS
    ? `var(--viz-series-${index + 1})`
    : "var(--viz-muted)"
}

export const VIZ = {
  muted: "var(--viz-muted)",
  track: "var(--viz-track)",
  grid: "var(--viz-grid)",
  axis: "var(--viz-axis)",
  /** The card behind the chart — the colour of the 2px gaps and rings. */
  surface: "var(--card)",
} as const

export type StatusRole = "good" | "warning" | "serious" | "critical"

export function statusColor(role: StatusRole): string {
  return `var(--viz-${role})`
}

/** Mark specs from the data-viz method, in one place so every chart obeys
 *  the same numbers. */
export const MARK = {
  /** Cap, never fill the band — the leftover is air. */
  barSize: 22,
  /** Rounded data-end, square at the baseline. */
  radius: 4,
  lineWidth: 2,
  dotRadius: 4,
  /** Surface gap between touching fills, and the ring on a marker. */
  gap: 2,
} as const

export function formatMs(ms: number | null): string {
  if (ms === null) return "—"
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.round((ms % 60_000) / 1000)
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`
}

/**
 * Shortens a label to fit a fixed-width axis.
 *
 * A category axis has a set width and Recharts does not truncate — an
 * over-long tick just runs off the left edge of the SVG and gets CLIPPED,
 * so the reader sees the tail of a model id with its start missing. An
 * explicit ellipsis at the end is the honest version; the full value stays
 * in the tooltip and the table view.
 */
export function ellipsize(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}

/** "1 run" / "17 runs" — a chart axis reading "1 runs" looks like a bug. */
export function plural(count: number, word: string, suffix = "s"): string {
  return `${count} ${word}${count === 1 ? "" : suffix}`
}

export function formatPercent(value: number | null, digits = 0): string {
  return value === null ? "—" : `${(value * 100).toFixed(digits)}%`
}

/** 1,284 / 12.9K / 4.2M — proportional figures, so no tabular-nums here. */
export function formatCount(value: number): string {
  if (value < 10_000) return value.toLocaleString()
  if (value < 1_000_000) return `${(value / 1000).toFixed(1)}K`
  return `${(value / 1_000_000).toFixed(1)}M`
}

/** "2026-09-01" -> "Sep 1". Parsed as UTC, matching how it was bucketed. */
export function formatDay(day: string): string {
  const parsed = new Date(`${day}T00:00:00Z`)
  return Number.isNaN(parsed.getTime())
    ? day
    : parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
}

export function formatRelative(at: number | null, now = Date.now()): string {
  if (at === null) return "Never"
  const seconds = Math.round((at - now) / 1000)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 30],
    ["month", 12],
  ]
  let value = seconds
  for (const [unit, span] of units) {
    if (Math.abs(value) < span) {
      return new Intl.RelativeTimeFormat(undefined, { style: "short" }).format(
        value,
        unit,
      )
    }
    value = Math.round(value / span)
  }
  return new Intl.RelativeTimeFormat(undefined, { style: "short" }).format(
    value,
    "year",
  )
}

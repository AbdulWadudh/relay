"use client"

import { MARK, VIZ } from "@/components/charts/tokens"

/**
 * A single ratio against a limit — never a two-slice pie.
 *
 * The unfilled track is a lighter step of the fill's OWN ramp (blue on
 * blue), held at the 2:1 ordinal floor, so state reads across the whole
 * bar rather than only where it is filled.
 *
 * Over-target is the interesting case and it is drawn, not clipped: the
 * fill saturates the track and the overshoot is stated in the label. A
 * meter that silently pins at 100% hides exactly the runs worth looking
 * at.
 */

export function Meter({
  value,
  limit,
  label,
  valueText,
  limitText,
  fill,
}: {
  value: number | null
  limit: number
  label: string
  valueText: string
  limitText: string
  /** Severity lives here — the caller decides good vs critical. */
  fill: string
}) {
  const ratio = value === null ? 0 : Math.min(value / limit, 1)
  const over = value !== null && value > limit

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground text-xs">{label}</span>
        <span className="font-medium text-foreground text-xs tabular-nums">
          {valueText}
        </span>
      </div>
      {/* Not the native <meter>: its track and fill cannot be styled to
          the palette across browsers, and the ARIA role carries the same
          semantics to assistive tech. */}
      {/* biome-ignore lint/a11y/useSemanticElements: native <meter> is not styleable to the palette */}
      <div
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full"
        style={{ background: VIZ.track }}
        role="meter"
        aria-valuenow={value ?? undefined}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={`${label}: ${valueText} against ${limitText}`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{
            width: `${Math.max(ratio * 100, value === null ? 0 : 2)}%`,
            background: fill,
          }}
        />
      </div>
      <p className="mt-1.5 text-muted-foreground text-xs">
        {over
          ? `${(value / limit).toFixed(1)}× the ${limitText} target`
          : `target ${limitText}`}
      </p>
    </div>
  )
}

/**
 * A 12-point trend, in the de-emphasis grey with the latest point in the
 * accent. Decoration-free: no axis, no labels, no tooltip — the number
 * above it is the value, this is only its shape.
 */
export function Sparkline({
  points,
  accent,
  label,
}: {
  points: number[]
  accent: string
  label: string
}) {
  if (points.length < 2) return <div className="h-8" />

  const max = Math.max(...points, 1)
  const step = 100 / (points.length - 1)
  const y = (value: number) => 30 - (value / max) * 26

  const path = points
    .map(
      (value, index) => `${index === 0 ? "M" : "L"}${index * step} ${y(value)}`,
    )
    .join(" ")
  const last = points[points.length - 1]

  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className="h-8 w-full"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <path
        d={path}
        fill="none"
        stroke={VIZ.muted}
        strokeWidth={MARK.lineWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* Surface ring, so the end dot stays legible where it crosses the
          line or sits against a gridline. */}
      <circle
        cx={100}
        cy={y(last)}
        r={MARK.dotRadius}
        fill={accent}
        stroke={VIZ.surface}
        strokeWidth={MARK.gap}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

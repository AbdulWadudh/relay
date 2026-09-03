"use client"

import { MARK } from "@/components/charts/tokens"

/**
 * Recharts' default bar is a plain square-cornered rect with no spacing
 * between stacked segments, which breaks two mark rules at once. This
 * replaces the shape.
 *
 * THE GAP IS SUBTRACTED WIDTH, NOT A STROKE. A 2px stroke in the surface
 * colour would draw a border all the way around the mark, and a border
 * around a mark is exactly what the gap exists to avoid — it adds
 * data-weight ink that is not data. Shortening every segment but the
 * outermost by 2px leaves real surface showing through instead.
 *
 * Only the outermost NON-ZERO segment of a row is rounded, so a stack
 * ends in one 4px data-end and stays square at the baseline. Which
 * segment that is depends on the row's values, not on declaration order,
 * which is why this has to be computed per bar rather than set as a
 * `radius` prop on the last <Bar>.
 */

interface ShapeProps {
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
  payload?: Record<string, unknown>
}

function outermostKey(
  payload: Record<string, unknown> | undefined,
  keys: string[],
): string | undefined {
  for (let index = keys.length - 1; index >= 0; index -= 1) {
    const value = payload?.[keys[index]]
    if (typeof value === "number" && value > 0) return keys[index]
  }
  return undefined
}

/**
 * A single (unstacked) horizontal bar: 4px rounded data-end, square at
 * the baseline. `fill` is passed per row so a chart can colour bars by an
 * entity without Recharts' <Cell>, which does not survive a custom shape.
 */
export function RoundedBar({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill,
}: ShapeProps) {
  if (width <= 0 || height <= 0) return null
  const r = Math.min(MARK.radius, width, height / 2)
  return (
    <path
      d={`M${x},${y} H${x + width - r} A${r},${r} 0 0 1 ${x + width},${y + r} V${y + height - r} A${r},${r} 0 0 1 ${x + width - r},${y + height} H${x} Z`}
      fill={fill}
    />
  )
}

/** Horizontal stack: rounds the end cap, squares the baseline. */
export function horizontalSegment(keys: string[], dataKey: string) {
  return function Segment(props: ShapeProps) {
    const { x = 0, y = 0, width = 0, height = 0, fill, payload } = props
    if (width <= 0 || height <= 0) return null
    const isEnd = outermostKey(payload, keys) === dataKey
    const w = Math.max(width - (isEnd ? 0 : MARK.gap), 0.5)
    const r = Math.min(isEnd ? MARK.radius : 0, w, height / 2)

    return (
      <path
        d={`M${x},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + height - r} A${r},${r} 0 0 1 ${x + w - r},${y + height} H${x} Z`}
        fill={fill}
      />
    )
  }
}

/** Vertical stack (columns over time): rounds the cap, squares the base. */
export function verticalSegment(keys: string[], dataKey: string) {
  return function Segment(props: ShapeProps) {
    const { x = 0, y = 0, width = 0, height = 0, fill, payload } = props
    if (width <= 0 || height <= 0) return null
    const isTop = outermostKey(payload, keys) === dataKey
    const h = Math.max(height - (isTop ? 0 : MARK.gap), 0.5)
    const top = isTop ? y : y + MARK.gap
    const r = Math.min(isTop ? MARK.radius : 0, width / 2, h)

    return (
      <path
        d={`M${x},${top + h} V${top + r} A${r},${r} 0 0 1 ${x + r},${top} H${x + width - r} A${r},${r} 0 0 1 ${x + width},${top + r} V${top + h} Z`}
        fill={fill}
      />
    )
  }
}

"use client"

import { Calendar03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { ANALYTICS_RANGES, type AnalyticsRange } from "@/lib/analytics/window"
import { cn } from "@/lib/utils"

/**
 * The dashboard's one filter, in one row, scoping everything below it.
 *
 * Presets as buttons rather than a calendar: nobody fights a date grid
 * for "last 30 days", and these four are the whole vocabulary
 * (ANALYTICS_RANGES — adding a preset is one entry there).
 *
 * Every panel re-renders against the same slice, so two cards can never
 * disagree about which window they are describing.
 */

export function RangeFilter({
  range,
  onChange,
  disabled = false,
}: {
  range: AnalyticsRange
  onChange: (range: AnalyticsRange) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <HugeiconsIcon
        icon={Calendar03Icon}
        size={16}
        strokeWidth={1.8}
        className="hidden text-muted-foreground sm:block"
        aria-hidden="true"
      />
      <fieldset className="flex items-center gap-1 rounded-lg border p-1">
        <legend className="sr-only">Time range</legend>
        {ANALYTICS_RANGES.map((preset) => {
          const active = preset.id === range
          return (
            <Button
              key={preset.id}
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-pressed={active}
              title={preset.label}
              onClick={() => onChange(preset.id)}
              className={cn(
                "h-8 px-3 font-medium text-xs transition-all duration-200",
                active
                  ? "bg-rose-600 text-white hover:bg-rose-600 dark:bg-rose-600"
                  : "hover:-translate-y-px hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600",
              )}
            >
              {preset.short}
            </Button>
          )
        })}
      </fieldset>
    </div>
  )
}

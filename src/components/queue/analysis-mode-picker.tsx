"use client"

import {
  ImageIcon,
  LayersIcon,
  SparklesIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { AnalysisMode } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

/**
 * The submitter usually knows whether a clip is someone talking or music
 * over on-screen text, and asking is cheaper and more reliable than
 * detecting it. "Auto" still walks the whole chain, so this is a shortcut,
 * never the only way to reach frames.
 */
const MODES: ReadonlyArray<{
  id: AnalysisMode
  label: string
  hint: string
  icon: typeof SparklesIcon
  /**
   * Selected border + light background, and the hover equivalent. Solid
   * shades in both themes, never an opacity fraction (RULES.md: no
   * translucent tints). Dark is -900, NOT -950: against a near-black
   * dialog a -950 wash is invisible, so dark mode would lose the highlight
   * light mode gets from -50 — the same pairing src/lib/provider-styles.ts
   * settled on.
   */
  selected: string
  hover: string
  /** Icon and hint tint while selected, readable on -50 and on -900. */
  chip: string
  /** Solid fill for the tick sitting on the accent. */
  fill: string
}> = [
  {
    id: "auto",
    label: "Auto",
    hint: "Reads speech, then captions, then video frames",
    icon: SparklesIcon,
    selected: "border-emerald-500 bg-emerald-50 dark:bg-emerald-900",
    hover:
      "hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900",
    chip: "text-emerald-700 dark:text-emerald-200",
    fill: "bg-emerald-600",
  },
  {
    id: "vision",
    label: "Frames",
    hint: "For music over on-screen text",
    icon: ImageIcon,
    selected: "border-sky-500 bg-sky-50 dark:bg-sky-900",
    hover: "hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900",
    chip: "text-sky-700 dark:text-sky-200",
    fill: "bg-sky-600",
  },
  {
    id: "both",
    label: "Speech + frames",
    hint: "Instructions split between the two",
    icon: LayersIcon,
    selected: "border-violet-500 bg-violet-50 dark:bg-violet-900",
    hover:
      "hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900",
    chip: "text-violet-700 dark:text-violet-200",
    fill: "bg-violet-600",
  },
]

export function ModePicker({
  value,
  onChange,
}: {
  value: AnalysisMode
  onChange: (mode: AnalysisMode) => void
}) {
  return (
    // ONE COLUMN, not three. Three across inside a max-w-lg dialog
    // truncated every hint to "Speech, then c…" and wrapped the longest
    // label onto a second line, so the cards came out different heights.
    <div className="grid gap-2" role="radiogroup" aria-label="Analysis">
      {MODES.map((mode) => {
        const active = value === mode.id
        return (
          // WAI-ARIA's radio pattern is button+role="radio" inside a
          // radiogroup; an <input type="radio"> cannot hold this layout.
          // biome-ignore lint/a11y/useSemanticElements: see above
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(mode.id)}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-start",
              "transition-all duration-200 hover:-translate-y-px active:translate-y-0",
              active ? mode.selected : cn("border-border", mode.hover),
            )}
          >
            <HugeiconsIcon
              icon={mode.icon}
              className={cn(
                "size-5 shrink-0 transition-colors duration-200",
                active ? mode.chip : "text-muted-foreground",
              )}
              strokeWidth={1.5}
            />
            <span className="grid min-w-0 flex-1 leading-tight">
              <span className="font-medium text-sm">{mode.label}</span>
              <span
                className={cn(
                  "text-xs transition-colors duration-200",
                  active ? mode.chip : "text-muted-foreground",
                )}
              >
                {mode.hint}
              </span>
            </span>
            {/* Reserved whether or not it is filled, so selecting a mode
                does not nudge the label sideways. */}
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                active ? mode.fill : "bg-transparent",
              )}
            >
              {active ? (
                <HugeiconsIcon
                  icon={Tick02Icon}
                  strokeWidth={3}
                  className="zoom-in size-3 animate-in text-white duration-200"
                />
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

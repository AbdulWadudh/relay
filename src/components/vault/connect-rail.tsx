"use client"

import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

/**
 * Progress rail for the connect wizard.
 *
 * Two animations, each doing a job rather than decorating:
 *
 *  * the fill bar scales toward the current step, which is the only signal
 *    telling the user how much of this is left, and
 *  * a completed node swaps its number for a tick, which is the receipt
 *    for the step they just finished.
 *
 * The bar animates `transform`, never `height`, so it composites on the
 * GPU. Both are wrapped in `motion-safe:` — under reduced motion the rail
 * still shows the correct state, it just arrives instantly.
 */

export interface RailStep {
  id: string
  title: string
}

export function ConnectRail({
  steps,
  current,
  onSelect,
}: {
  steps: readonly RailStep[]
  /** Index of the active step. */
  current: number
  /** Jump back to an already-completed step. Forward is not allowed. */
  onSelect: (index: number) => void
}) {
  // The fill spans the gaps BETWEEN nodes, so its full extent is one less
  // than the node count. Guarded so a single-step rail cannot divide by 0.
  const progress =
    steps.length > 1 ? Math.min(current / (steps.length - 1), 1) : 1

  return (
    <nav
      aria-label="Progress"
      className="landscape:sm:w-52 landscape:sm:shrink-0"
    >
      <ol className="flex gap-1 landscape:sm:relative landscape:sm:block landscape:sm:gap-0">
        {/* Track and fill sit behind the nodes in the side-by-side layout
            only; the stacked layout is a row of segments and needs neither.

            Every breakpoint here is `landscape:sm:`, not `sm:`. Width alone
            put a portrait tablet on the desktop rail -- an iPad is 768px
            across, well past `sm`, but it has a phone's proportions and the
            vertical rail eats the width the step content needs. Orientation
            is the honest signal: a portrait screen gets the stacked layout
            whatever its width, and a landscape one gets the rail once it is
            wide enough for both columns. */}
        <li
          aria-hidden
          className="pointer-events-none absolute top-4 bottom-4 left-[15px] hidden w-px bg-border landscape:sm:block"
        >
          <span
            className="block h-full w-full origin-top bg-emerald-600 transition-transform duration-500 ease-out motion-reduce:transition-none"
            style={{ transform: `scaleY(${progress})` }}
          />
        </li>

        {steps.map((step, index) => {
          const done = index < current
          const active = index === current
          const reachable = index <= current

          return (
            <li
              key={step.id}
              className="flex-1 landscape:sm:flex-none landscape:sm:pb-6 landscape:sm:last:pb-0"
            >
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onSelect(index)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg text-start transition-colors",
                  "landscape:sm:relative landscape:sm:bg-transparent",
                  reachable
                    ? "cursor-pointer hover:text-foreground"
                    : "cursor-not-allowed",
                )}
              >
                {/* Stacked: a segment bar. Side-by-side: a numbered node. */}
                <span
                  aria-hidden
                  className={cn(
                    "h-1 w-full rounded-full transition-colors duration-300 landscape:sm:hidden",
                    done || active ? "bg-emerald-600" : "bg-border",
                  )}
                />
                <span
                  aria-hidden
                  className={cn(
                    "hidden size-8 shrink-0 items-center justify-center rounded-full border-2 font-mono text-xs transition-all duration-300 landscape:sm:flex",
                    done && "border-emerald-600 bg-emerald-600 text-white",
                    active &&
                      "border-emerald-600 bg-background text-emerald-700 dark:text-emerald-300",
                    !done &&
                      !active &&
                      "border-border bg-background text-muted-foreground",
                  )}
                >
                  {done ? (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      size={15}
                      strokeWidth={2.5}
                      className="motion-safe:zoom-in motion-safe:animate-in motion-safe:duration-200"
                    />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    "hidden text-sm transition-colors landscape:sm:block",
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

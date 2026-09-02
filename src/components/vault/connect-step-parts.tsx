"use client"

import { Alert02Icon, Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { Button } from "@/components/ui/button"

/**
 * The three presentational pieces the connect steps are built from.
 *
 * Split out of cookie-import-steps.tsx to keep that file under the 250
 * line cap (RULES.md:56) once the mobile branches landed. No logic here,
 * and nothing provider-specific.
 */

/** Warnings the user must read BEFORE acting, so they sit above the action. */
export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-amber-600 bg-amber-50 p-4 dark:bg-amber-950">
      <HugeiconsIcon
        icon={Alert02Icon}
        size={18}
        strokeWidth={2}
        className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300"
      />
      <p className="text-amber-900 text-sm leading-relaxed dark:text-amber-100">
        {children}
      </p>
    </div>
  )
}

/**
 * One action inside a step that is itself a short ordered sequence.
 *
 * The number is the point: these have to happen in order, and the export
 * step in particular breaks if the user does them in any other one.
 */
export function SubStep({
  index,
  title,
  children,
}: {
  index: number
  title: string
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border font-mono text-muted-foreground text-xs">
        {index}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-medium text-sm">{title}</p>
        <div className="text-muted-foreground text-sm leading-relaxed">
          {children}
        </div>
      </div>
    </li>
  )
}

/** A URL the user must open in ANOTHER browser, so it is copyable. */
export function CopyableUrl({ url }: { url: string }) {
  const [copied, setCopied] = React.useState(false)

  // Cleared on a timer, so the timer is cleaned up if the step changes
  // before it fires.
  React.useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted p-2 pl-4">
      <code className="flex-1 truncate font-mono text-foreground text-xs">
        {url}
      </code>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          void navigator.clipboard.writeText(url).then(() => setCopied(true))
        }}
        className="shrink-0 transition-colors hover:text-sky-700 active:scale-[0.97] dark:hover:text-sky-300"
      >
        <HugeiconsIcon
          icon={copied ? Tick02Icon : Copy01Icon}
          size={15}
          strokeWidth={2}
        />
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  )
}

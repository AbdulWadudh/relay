import { HugeiconsIcon } from "@hugeicons/react"
import type { ComponentProps } from "react"

import { SourceIcon } from "@/components/queue/source-icon"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type PanelTone = "neutral" | "progress" | "success" | "warning"

const TONE_TILE: Record<PanelTone, string> = {
  neutral: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100",
  progress: "bg-amber-600 text-white",
  success: "bg-emerald-600 text-white",
  warning: "bg-rose-600 text-white",
}

// One card for every share state, so the layout can't dance as it swaps.
export function SharePanel({
  tone,
  icon,
  title,
  description,
  sharedUrl,
  source,
  extra,
  children,
}: {
  tone: PanelTone
  icon: ComponentProps<typeof HugeiconsIcon>["icon"]
  title: string
  description: string
  sharedUrl?: string
  source?: string
  extra?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <Card className="w-full max-w-lg">
      {/* `flex-row`, not the primitive's default: CardHeader is a
          single-column `grid`, so the icon tile took a full-width row of
          its own and pushed the title beneath it. The `shrink-0` below was
          always written for a row. */}
      <CardHeader className="flex flex-row items-start gap-4">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-md",
            TONE_TILE[tone],
          )}
        >
          <HugeiconsIcon icon={icon} className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 space-y-1.5">
          <CardTitle className="font-heading text-xl tracking-tight">
            {title}
          </CardTitle>
          <p aria-live="polite" className="text-muted-foreground text-sm">
            {description}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {sharedUrl ? (
          <div className="flex items-center gap-2.5 rounded-md border border-border bg-muted px-3 py-2.5">
            {source ? <SourceIcon source={source} className="size-5" /> : null}
            {/* break-all, not truncate: at 390px truncation hides the id. */}
            <span className="min-w-0 break-all font-mono text-xs leading-5">
              {sharedUrl}
            </span>
          </div>
        ) : null}
        {extra}
        {/* Right-aligned from `sm` up, the same contract as Modal's
            footer (`justify-end`) — on a tablet these sat left while every
            dialog in the app put its actions right. Below `sm` they stay a
            full-width stack, where alignment is meaningless. */}
        {children ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            {children}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

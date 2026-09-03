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
  children,
}: {
  tone: PanelTone
  icon: ComponentProps<typeof HugeiconsIcon>["icon"]
  title: string
  description: string
  sharedUrl?: string
  source?: string
  children?: React.ReactNode
}) {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="items-start gap-4">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-md",
            TONE_TILE[tone],
          )}
        >
          <HugeiconsIcon icon={icon} className="size-5" aria-hidden />
        </div>
        <div className="space-y-1.5">
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
        {children ? (
          <div className="flex flex-col gap-3 sm:flex-row">{children}</div>
        ) : null}
      </CardContent>
    </Card>
  )
}

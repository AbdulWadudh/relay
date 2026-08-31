import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { type RunStatus, runStatusMeta } from "@/lib/run-status"
import { cn } from "@/lib/utils"

/**
 * Solid-fill status pill (RULES.md: solid colors, no translucency).
 *
 * The spinner renders ONLY while a run is moving. An always-present
 * fixed-size slot was tried and removed: on terminal states it left an
 * empty box inside the pill, so "Done" and "Failed" read as pushed to the
 * right of their own badge. Column width is reserved by the table cell
 * instead, which keeps the layout stable without deforming the pill.
 */
export function RunStatusBadge({
  status,
  className,
}: {
  status: RunStatus
  className?: string
}) {
  const meta = runStatusMeta(status)

  return (
    <Badge
      className={cn("shrink-0 border-transparent", meta.badge, className)}
      // Announce the change to screen readers as the run progresses, and
      // never rely on colour alone to convey state.
      aria-live={meta.active ? "polite" : undefined}
    >
      {meta.active ? <Spinner className="size-2.5" /> : null}
      {meta.label}
    </Badge>
  )
}

import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  QuoteIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

/**
 * What the evidence check found (PRD §6 "100% grounding"). Shown whether
 * or not anything was flagged — "0 flagged" is the claim the product is
 * making, and hiding it when everything passed would leave the reader
 * unable to tell a verified page from an unchecked one.
 */

export interface VerificationCounts {
  extracted: number
  verified: number
  flagged: number
}

export function readVerification(
  result: Record<string, unknown> | null,
): VerificationCounts | null {
  const raw = result?.verification
  if (typeof raw !== "object" || raw === null) return null
  const value = raw as Record<string, unknown>
  if (typeof value.extracted !== "number") return null
  return {
    extracted: value.extracted,
    verified: typeof value.verified === "number" ? value.verified : 0,
    flagged: typeof value.flagged === "number" ? value.flagged : 0,
  }
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: number
  tone: string
  icon?: typeof Alert02Icon
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={cn("flex items-center gap-1.5 font-medium", tone)}>
        {icon ? (
          <HugeiconsIcon
            icon={icon}
            strokeWidth={2}
            className="size-4"
            aria-hidden
          />
        ) : null}
        <span className="font-mono text-lg tabular-nums">{value}</span>
      </span>
    </div>
  )
}

export function VerificationSummary({
  counts,
}: {
  counts: VerificationCounts
}) {
  const clean = counts.flagged === 0
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border p-5",
        clean ? "border-emerald-600" : "border-amber-600",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <Stat
          label="Claims extracted"
          value={counts.extracted}
          tone="text-foreground"
          icon={QuoteIcon}
        />
        <Stat
          label="Verified"
          value={counts.verified}
          tone="text-emerald-700 dark:text-emerald-400"
          icon={CheckmarkCircle02Icon}
        />
        <Stat
          label="Flagged"
          value={counts.flagged}
          tone={
            clean
              ? "text-muted-foreground"
              : "text-amber-700 dark:text-amber-400"
          }
          icon={clean ? undefined : Alert02Icon}
        />
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {clean
          ? "Every claim quotes the transcript verbatim, and every timestamp falls inside the segment the words were spoken in."
          : "Flagged claims could not be matched to the transcript. They are kept and marked rather than removed — the reason for each is in the stored data."}
      </p>
    </div>
  )
}

"use client"

import { RefreshIcon, ViewIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { RUN_STATUS_META } from "@/lib/run-status"

import type { ExistingRun } from "./existing-run"
import { SharePanel } from "./share-panel"

export function ShareExisting({
  existing,
  label,
  sharedUrl,
  source,
  onRunAgain,
}: {
  existing: ExistingRun
  /** "YouTube video" / "Instagram Reel", from the source registry. */
  label: string
  sharedUrl: string
  source: string
  onRunAgain: () => void
}) {
  const meta = RUN_STATUS_META[existing.status]
  const when = new Date(existing.createdAt).toLocaleDateString()

  return (
    <SharePanel
      tone={existing.status === "failed" ? "warning" : "success"}
      icon={ViewIcon}
      title="You've shared this before"
      description={`This ${label} already has a run from ${when} — ${meta.label.toLowerCase()}. Open it, or process it again.`}
      sharedUrl={sharedUrl}
      source={source}
    >
      {/* `replace` for the same reason as the queued panel: this share is
          resolved, so Back should not return to a share prompt. "Run it
          again" stays a normal action — it re-queues and lands on the
          success panel, which replaces from there. */}
      <Button
        nativeButton={false}
        render={<Link replace href={`/runs/${existing.id}`} />}
        className="transition-all duration-200 hover:-translate-y-px"
      >
        <HugeiconsIcon icon={ViewIcon} data-icon="inline-start" />
        View that run
      </Button>
      <Button
        variant="outline"
        onClick={onRunAgain}
        className="transition-all duration-200 hover:-translate-y-px hover:border-amber-500 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600"
      >
        <HugeiconsIcon icon={RefreshIcon} data-icon="inline-start" />
        Run it again
      </Button>
    </SharePanel>
  )
}

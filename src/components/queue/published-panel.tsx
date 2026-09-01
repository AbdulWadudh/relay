import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ExternalLink } from "@/components/queue/linkify"
import { providerLabel } from "@/lib/providers"

/**
 * Where the finished run ended up. The destination URL is the point of the
 * whole pipeline, so it gets its own panel rather than a line in the
 * raw-data blob.
 */
export function PublishedPanel({
  url,
  provider,
}: {
  url: string
  provider?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-600 p-5">
      <HugeiconsIcon
        icon={CheckmarkCircle02Icon}
        strokeWidth={2}
        className="size-5 shrink-0 text-emerald-700 dark:text-emerald-400"
        aria-hidden
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-medium text-sm">
          Published to {providerLabel(provider ?? "notion")}
        </p>
        <ExternalLink
          href={url}
          label={url}
          className="w-fit font-mono text-xs"
        />
      </div>
    </div>
  )
}

import Instagram from "@thesvg/react/instagram"
import Youtube from "@thesvg/react/youtube"
import type { ComponentType, SVGProps } from "react"

import type { MediaSourceId } from "@/lib/media/sources"
import { cn } from "@/lib/utils"

/**
 * Brand mark for the platform a run came from.
 *
 * Keyed as `Record<MediaSourceId, ...>` so adding a source to
 * src/lib/media/sources.ts is a compile error until it has an icon — the
 * same exhaustiveness trick the stage timeline uses. The registry itself
 * stays free of React imports because it is also pulled into
 * src/lib/schemas.ts on both client and server.
 *
 * Rendered in each brand's own colours (the `default` variant) rather than
 * `currentColor`, matching how the Vault renders provider marks.
 */

const SOURCE_ICON: Record<
  MediaSourceId,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  instagram: Instagram,
  youtube: Youtube,
}

export function SourceIcon({
  source,
  className,
}: {
  /** Run's `source` column, typed loosely since it comes from the db. */
  source: string
  className?: string
}) {
  const Icon = (
    SOURCE_ICON as Record<
      string,
      ComponentType<SVGProps<SVGSVGElement>> | undefined
    >
  )[source]
  if (!Icon) return null
  return <Icon className={cn("size-4 shrink-0", className)} aria-hidden />
}

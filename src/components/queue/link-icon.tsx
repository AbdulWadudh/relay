"use client"

import { Link02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Discord from "@thesvg/react/discord"
import Facebook from "@thesvg/react/facebook"
import Github from "@thesvg/react/github"
import Linkedin from "@thesvg/react/linkedin"
import Pinterest from "@thesvg/react/pinterest"
import Reddit from "@thesvg/react/reddit"
import Telegram from "@thesvg/react/telegram"
import Threads from "@thesvg/react/threads"
import Tiktok from "@thesvg/react/tiktok"
import Twitter from "@thesvg/react/twitter"
import Whatsapp from "@thesvg/react/whatsapp"
import X from "@thesvg/react/x"
import type { ComponentType, SVGProps } from "react"
import * as React from "react"

import { SourceIcon } from "@/components/queue/source-icon"
import config from "@/config"
import { sourceIdForHost } from "@/lib/media/sources"
import { cn } from "@/lib/utils"

/**
 * Icon for an arbitrary external link, resolved in three tiers:
 *
 *  1. A media source we ingest from (YouTube, Instagram) — its own mark.
 *  2. Another platform we bundle a brand mark for. Video descriptions are
 *     mostly social links, so this covers the common case with NO network
 *     request and a crisp vector at any size.
 *  3. Anything else — the configured favicon service, falling back to a
 *     generic glyph if it errors or is disabled.
 *
 * Tier 3 is the only one that touches the network, and it is the user's
 * browser making the call, so `config.links.faviconUrl` can be blanked to
 * turn it off entirely.
 */

type Brand = ComponentType<SVGProps<SVGSVGElement>>

/** Keyed by second-level domain, so pinterest.ca and m.youtube.com match. */
const BRANDS: Record<string, Brand> = {
  facebook: Facebook,
  twitter: Twitter,
  x: X,
  pinterest: Pinterest,
  tiktok: Tiktok,
  linkedin: Linkedin,
  reddit: Reddit,
  threads: Threads,
  whatsapp: Whatsapp,
  telegram: Telegram,
  github: Github,
  discord: Discord,
}

/** "www.pinterest.ca" -> "pinterest"; "m.youtube.com" -> "youtube". */
function secondLevel(host: string): string {
  const labels = host.split(".")
  return labels.length >= 2 ? (labels[labels.length - 2] ?? "") : host
}

function faviconFor(host: string): string | null {
  const template = config.links.faviconUrl
  if (!template) return null
  return template.replace("{host}", encodeURIComponent(host))
}

export function LinkIcon({
  host,
  className,
}: {
  host: string | null
  className?: string
}) {
  const [faviconFailed, setFaviconFailed] = React.useState(false)
  const size = cn("size-3.5 shrink-0", className)

  if (!host) {
    return (
      <HugeiconsIcon
        icon={Link02Icon}
        strokeWidth={2}
        className={size}
        aria-hidden
      />
    )
  }

  const sourceId = sourceIdForHost(host)
  if (sourceId) return <SourceIcon source={sourceId} className={size} />

  const Brand = BRANDS[secondLevel(host)]
  if (Brand) return <Brand className={size} aria-hidden />

  const favicon = faviconFailed ? null : faviconFor(host)
  if (favicon) {
    return (
      <img
        src={favicon}
        alt=""
        aria-hidden
        loading="lazy"
        className={cn(size, "rounded-[2px] object-contain")}
        onError={() => setFaviconFailed(true)}
      />
    )
  }

  return (
    <HugeiconsIcon
      icon={Link02Icon}
      strokeWidth={2}
      className={size}
      aria-hidden
    />
  )
}

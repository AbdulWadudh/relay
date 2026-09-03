/**
 * Supported ingest sources (PRD §4.1: public Instagram Reels and YouTube
 * Shorts only).
 *
 * Single source of truth for source vocabulary, the same way
 * src/lib/providers.ts owns credential providers (RULES.md: no hardcoding).
 * Adding a source means one entry here — the Zod schema, the pipeline, and
 * the UI's supported-sources copy all derive from this list, and nothing
 * downstream matches on a source string literal.
 *
 * Deliberately dependency-free (pure `URL` + regex) so it can be imported
 * from src/lib/schemas.ts, which client components also pull in.
 */

export interface MediaSource {
  id: string
  /** Human-facing name of one item from this source, singular. */
  label: string
  /** Hostnames this source owns, after `www.`/`m.` are stripped. */
  hosts: readonly string[]
  /**
   * Paths that identify a supported item. Capture group 1 is the item id.
   * Anchored on both ends so a merely similar path can't slip through.
   */
  patterns: readonly RegExp[]
  /** Rebuilds a clean URL from the item id, dropping tracking params. */
  canonical: (itemId: string) => string
  /**
   * Send this source's fetches through `config.media.proxyUrl`.
   *
   * Per-source and declared HERE rather than in the download step, so
   * adding or removing it is one line in the registry and
   * src/lib/media/download.ts never names a platform (RULES.md).
   *
   * Only YouTube needs it: it is the only source measured to refuse the
   * production host's datacenter address outright. Instagram authenticates
   * with the user's own jar and works direct, so proxying it would put a
   * third party in the path of a live session and buy nothing.
   */
  proxied?: boolean
}

export const MEDIA_SOURCES = [
  {
    id: "instagram",
    label: "Instagram Reel",
    hosts: ["instagram.com"],
    patterns: [
      // instagram.com/reel/<code> and the /reels/ alias.
      /^\/reels?\/([A-Za-z0-9_-]+)\/?$/,
      // instagram.com/<account>/reel/<code> — the share sheet's format.
      /^\/[^/]+\/reels?\/([A-Za-z0-9_-]+)\/?$/,
    ],
    canonical: (itemId) => `https://www.instagram.com/reel/${itemId}/`,
  },
  {
    id: "youtube",
    label: "YouTube Short",
    hosts: ["youtube.com"],
    patterns: [/^\/shorts\/([A-Za-z0-9_-]{5,})\/?$/],
    canonical: (itemId) => `https://www.youtube.com/shorts/${itemId}`,
    proxied: true,
  },
] as const satisfies readonly MediaSource[]

export type MediaSourceId = (typeof MEDIA_SOURCES)[number]["id"]

/**
 * `as const` above is what derives `MediaSourceId`, but it also narrows
 * every field to a literal — `hosts.includes(someString)` won't typecheck
 * against a `readonly ["instagram.com"]`. Runtime lookups go through this
 * widened view instead.
 */
const SOURCES: readonly (Omit<MediaSource, "id"> & { id: MediaSourceId })[] =
  MEDIA_SOURCES

export interface ParsedSource {
  source: MediaSourceId
  label: string
  /** The source's own item id (Reel shortcode / Shorts video id). */
  itemId: string
  /** Tracking-free URL handed to yt-dlp and stored on the run. */
  canonicalUrl: string
  /**
   * Resolved from the registry's `proxied` flag at parse time, exactly as
   * `label` and `canonicalUrl` are. Carrying it on the parsed source is
   * what lets the download step decide whether to proxy by reading a
   * boolean instead of comparing a source id against a literal.
   */
  proxied: boolean
}

/** "Instagram Reel or YouTube Short" — for validation and empty-state copy. */
export const SUPPORTED_SOURCE_LABELS: string = (() => {
  const labels = SOURCES.map((source) => source.label)
  if (labels.length < 2) return labels.join("")
  return `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`
})()

export function sourceLabel(id: string): string {
  return SOURCES.find((source) => source.id === id)?.label ?? id
}

/**
 * Matches a bare hostname (not a full item URL) to a source, so a link to
 * any page on a known platform can carry that platform's brand mark.
 */
export function sourceIdForHost(host: string): MediaSourceId | null {
  const clean = host.toLowerCase().replace(/^(www\.|m\.)/, "")
  return SOURCES.find((source) => source.hosts.includes(clean))?.id ?? null
}

/**
 * Returns null for anything that isn't a supported public item URL — a
 * different host, a YouTube watch/playlist page, an Instagram profile, or
 * a non-http(s) scheme. Whether the item is actually *public* can only be
 * settled by the download itself; that failure is mapped in ingest.ts.
 */
export function parseSourceUrl(raw: string): ParsedSource | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null

  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "")

  for (const source of SOURCES) {
    if (!source.hosts.includes(host)) continue
    for (const pattern of source.patterns) {
      const itemId = pattern.exec(url.pathname)?.[1]
      if (!itemId) continue
      return {
        source: source.id,
        label: source.label,
        itemId,
        canonicalUrl: source.canonical(itemId),
        proxied: source.proxied === true,
      }
    }
  }
  return null
}

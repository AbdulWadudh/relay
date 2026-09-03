/**
 * Supported ingest sources: public Instagram Reels, and YouTube Shorts and
 * watch pages (PRD §4.1 said Shorts only — widened 2026-09-03).
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

/** One URL shape a source can be linked by. */
interface MediaPatternBase {
  /** Anchored. Capture group 1 is the item id, unless `param` is set. */
  path: RegExp
  /**
   * Narrows the shape to some of the source's `hosts`. Needed because
   * `youtu.be/<id>` is a bare segment, and that same pattern on
   * youtube.com would match a legacy channel URL like /mrbeast6000.
   */
  hosts?: readonly string[]
  canonical?: (itemId: string) => string
}

// The union makes `id` mandatory with `param`: an id from a query string is
// unconstrained by the path regex and ends up in yt-dlp's argv.
export type MediaPattern =
  | (MediaPatternBase & { param?: never; id?: never })
  | (MediaPatternBase & { param: string; id: RegExp })

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

export interface MediaSource {
  id: string
  /** Human-facing name of one item from this source, singular. */
  label: string
  /** Hostnames this source owns, after `www.`/`m.` are stripped. */
  hosts: readonly string[]
  patterns: readonly MediaPattern[]
  /** Default rebuild, for shapes that don't declare their own. */
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
      { path: /^\/reels?\/([A-Za-z0-9_-]+)\/?$/ },
      // instagram.com/<account>/reel/<code> — the share sheet's format.
      { path: /^\/[^/]+\/reels?\/([A-Za-z0-9_-]+)\/?$/ },
    ],
    canonical: (itemId) => `https://www.instagram.com/reel/${itemId}/`,
  },
  {
    id: "youtube",
    // "video", not "Short": full watch pages are accepted too.
    label: "YouTube video",
    hosts: ["youtube.com", "youtu.be"],
    patterns: [
      // Keeps the /shorts/ canonical form the proxy work was measured
      // against (EGRESS_PROXY.md).
      { path: /^\/shorts\/([A-Za-z0-9_-]{5,})\/?$/, hosts: ["youtube.com"] },
      {
        path: /^\/watch\/?$/,
        hosts: ["youtube.com"],
        param: "v",
        id: YOUTUBE_VIDEO_ID,
        canonical: (itemId) => `https://www.youtube.com/watch?v=${itemId}`,
      },
      // A bare id says nothing about whether it's a Short; /watch?v=
      // serves both.
      {
        path: /^\/([A-Za-z0-9_-]{11})\/?$/,
        hosts: ["youtu.be"],
        canonical: (itemId) => `https://www.youtube.com/watch?v=${itemId}`,
      },
    ],
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
  /** The source's own item id (Reel shortcode / YouTube video id). */
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

/** "Instagram Reel or YouTube video" — validation and empty-state copy. */
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
 * different host, a YouTube playlist or channel page, an Instagram profile,
 * or a non-http(s) scheme. Whether the item is actually *public* can only
 * be settled by the download itself; that failure is mapped in ingest.ts.
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
    for (const shape of source.patterns) {
      if (shape.hosts && !shape.hosts.includes(host)) continue
      const match = shape.path.exec(url.pathname)
      if (!match) continue

      // `continue`, not `return null`: another shape may still match.
      let itemId: string
      if (shape.param) {
        const fromQuery = url.searchParams.get(shape.param)
        if (!fromQuery || !shape.id.test(fromQuery)) continue
        itemId = fromQuery
      } else {
        const fromPath = match[1]
        if (!fromPath) continue
        itemId = fromPath
      }

      return {
        source: source.id,
        label: source.label,
        itemId,
        canonicalUrl: (shape.canonical ?? source.canonical)(itemId),
        proxied: source.proxied === true,
      }
    }
  }
  return null
}

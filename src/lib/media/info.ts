/**
 * What the source metadata in `additional_data` is made of.
 *
 * Split out of `src/lib/media/download.ts`, which was over the 250-line
 * cap: that file orchestrates a download, this decides which of yt-dlp's
 * ~500 KB of info JSON is worth keeping and what a usable title looks like.
 * The two change for unrelated reasons.
 */

/**
 * yt-dlp's info JSON is ~500 KB, almost all of it `automatic_captions` and
 * per-format tables. These keys are dropped (along with every `_`-prefixed
 * internal), leaving ~2.5 KB of genuinely analysable source metadata —
 * title, description, channel, view/like counts, tags, upload date,
 * availability. `url`/`downloader_options`/`http_headers` carry short-lived
 * signed CDN URLs that are meaningless once the run ends.
 */
const DROPPED_INFO_KEYS = new Set([
  "automatic_captions",
  "subtitles",
  "formats",
  "requested_formats",
  "requested_downloads",
  "thumbnails",
  "heatmap",
  "chapters",
  "comments",
  "fragments",
  "http_headers",
  "downloader_options",
  "url",
])

export function pruneInfo(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {}
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(
      ([key]) => !DROPPED_INFO_KEYS.has(key) && !key.startsWith("_"),
    ),
  )
}

/**
 * A title that says nothing but who posted it — measured 2026-09-02, a
 * Reel yt-dlp titles `"Video by aathirasethumadhavan"` whose caption
 * begins "29g protein & 405 calories per serving".
 *
 * Extractors for caption-first platforms have no title field to report, so
 * they synthesize one from the uploader. Agent routing reads `title`, so
 * left alone it would degrade on every such item.
 *
 * Matched on the DATA, not on a source id: any extractor whose title is
 * empty or is exactly the uploader's name restated gets the same
 * treatment, and `src/lib/media/download.ts` stays provider-generic
 * (RULES.md:57-58).
 */
function isPlaceholderTitle(
  title: string,
  info: Record<string, unknown>,
): boolean {
  if (title.trim().length === 0) return true
  const names = [info.channel, info.uploader, info.uploader_id]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase())
  const stripped = title.toLowerCase().replace(/^(video|post|reel)\s+by\s+/, "")
  return stripped !== title.toLowerCase() && names.includes(stripped.trim())
}

/**
 * Gives caption-first sources a title a person would recognise, taken from
 * the caption's first line. This is `mapInfo`'s old behaviour from the
 * deleted instaloader path, carried over onto yt-dlp's info shape — the
 * §1.2 experiment found the caption intact in `description`, so nothing is
 * lost by dropping the second downloader.
 *
 * Exported for the acceptance check in scripts/verify-ytdlp.ts, which
 * runs it against a real Reel's info JSON — the placeholder rule is
 * matched on data, so a yt-dlp release that changes the shape of a
 * synthesized title has to be caught by running it, not by reading it.
 */
export function withSyntheticTitle(
  info: Record<string, unknown>,
): Record<string, unknown> {
  const title = typeof info.title === "string" ? info.title : ""
  if (!isPlaceholderTitle(title, info)) return info

  const description =
    typeof info.description === "string" ? info.description : ""
  const firstLine = description.split("\n")[0]?.trim().slice(0, 200)
  return firstLine ? { ...info, title: firstLine } : info
}

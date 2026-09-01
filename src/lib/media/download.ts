import { $ } from "bun"

import config from "@/config"
import { lastLine, MediaIngestError } from "@/lib/media/errors"
import { downloadWithInstaloader } from "@/lib/media/instaloader"
import type { ParsedSource } from "@/lib/media/sources"

/**
 * The download step (TRD §3 step 2): media into the run's temp directory,
 * plus the source metadata that lands in `additional_data`.
 *
 * Dispatched PER SOURCE. yt-dlp handles everything it can reach, but it
 * cannot fetch Instagram Reels anonymously, so Instagram goes through
 * instaloader instead. Both return the same shape, so nothing downstream
 * knows which tool ran.
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

function pruneInfo(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {}
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(
      ([key]) => !DROPPED_INFO_KEYS.has(key) && !key.startsWith("_"),
    ),
  )
}

/**
 * yt-dlp reports private, deleted, rate-limited and login-gated items
 * through the same "not available" family of messages — they're one
 * user-facing outcome ("we can't reach this"), distinct from a genuine
 * tool failure that an operator needs to see verbatim.
 */
const UNAVAILABLE =
  /private|login|sign in|not available|unavailable|removed|does not exist|age.?restrict/i

export interface DownloadResult {
  /** Absolute path to the downloaded media, in whatever container served. */
  mediaPath: string
  info: Record<string, unknown>
}

export async function download(
  source: ParsedSource,
  dir: string,
): Promise<DownloadResult> {
  if (source.source === "instagram") {
    return await downloadWithInstaloader(source, dir)
  }
  return await downloadWithYtDlp(source, dir)
}

async function downloadWithYtDlp(
  source: ParsedSource,
  dir: string,
): Promise<DownloadResult> {
  const pathFile = `${dir}/source.path`
  // A newline inside a Bun `$` template is a command separator, so the
  // invocation stays one line and passes its arguments as an array — each
  // element is escaped into exactly one argv entry.
  const args = [
    "--no-playlist",
    "--no-warnings",
    "--no-progress",
    "--no-simulate",
    "-f",
    "bestaudio/best",
    "-o",
    `${dir}/source.%(ext)s`,
    "--write-info-json",
    // `after_move:` resolves after yt-dlp renames the file to its final
    // name; the default (`video:`) prints "NA" because it runs too early.
    "--print-to-file",
    "after_move:%(filepath)s",
    pathFile,
    source.canonicalUrl,
  ]
  const result = await $`${config.media.ytDlpPath} ${args}`.nothrow().quiet()

  if (result.exitCode !== 0) {
    const stderr = lastLine(result.stderr.toString())
    throw new MediaIngestError(
      UNAVAILABLE.test(stderr) ? "SOURCE_UNAVAILABLE" : "DOWNLOAD_FAILED",
      UNAVAILABLE.test(stderr)
        ? `This ${source.label} isn't publicly downloadable — it may be private, age-restricted, removed, or require a signed-in session.`
        : // Include the exit code when stderr is empty — a bare
          // "yt-dlp failed" gives an operator nothing to act on.
          `Could not download this ${source.label}: ${stderr || `yt-dlp exited ${result.exitCode} with no output`}`,
    )
  }

  const mediaPath = (
    await Bun.file(pathFile)
      .text()
      .catch(() => "")
  ).trim()
  if (!mediaPath) {
    throw new MediaIngestError(
      "DOWNLOAD_FAILED",
      `yt-dlp reported success but produced no file for this ${source.label}.`,
    )
  }

  const info = pruneInfo(
    await Bun.file(`${dir}/source.info.json`)
      .json()
      .catch(() => null),
  )
  return { mediaPath, info }
}

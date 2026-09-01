import { $ } from "bun"

import config from "@/config"
import { lastLine, MediaIngestError } from "@/lib/media/errors"
import { downloadWithInstaloader } from "@/lib/media/instaloader"
import type { ParsedSource } from "@/lib/media/sources"
import { logger } from "@/lib/observability/logger"
import { providerLabel } from "@/lib/providers"

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

/**
 * A 403 on the MEDIA fetch, after metadata already resolved. This is the
 * source refusing one particular client rather than the item being gone,
 * so it is retryable on a different `player_client` — see
 * `config.media.ytDlpFallbacks`. Deliberately NOT part of UNAVAILABLE: a
 * 403 that every client returns means something different from a private
 * or deleted item, and only earns that classification once the fallbacks
 * are exhausted.
 */
const CLIENT_REFUSED = /\b403\b|forbidden/i

interface YtDlpAttempt {
  ok: boolean
  /** Last stderr line — the line carrying the actual reason. */
  stderr: string
  exitCode: number
}

export interface DownloadResult {
  /** Absolute path to the downloaded media, in whatever container served. */
  mediaPath: string
  info: Record<string, unknown>
}

export async function download(
  source: ParsedSource,
  dir: string,
  /**
   * The user's signed-in jar, when they have connected this source. Null
   * means anonymous, which is exactly the behaviour that shipped before
   * session capture existed (SESSION_AUTH.md §4.2).
   */
  cookiesPath?: string | null,
): Promise<DownloadResult> {
  if (source.source === "instagram") {
    return await downloadWithInstaloader(source, dir)
  }
  return await downloadWithYtDlp(source, dir, cookiesPath ?? null)
}

async function runYtDlp(
  source: ParsedSource,
  dir: string,
  pathFile: string,
  extractorArgs: string | null,
  cookiesPath: string | null,
): Promise<YtDlpAttempt> {
  // `--print-to-file` APPENDS. A line left by a previous attempt would be
  // read as this attempt's output, so the file is cleared each time.
  await $`rm -f ${pathFile}`.nothrow().quiet()

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
    ...(extractorArgs ? ["--extractor-args", extractorArgs] : []),
    // Read-write: yt-dlp writes the rotated jar back here on exit, which
    // src/lib/media/cookies.ts persists.
    ...(cookiesPath ? ["--cookies", cookiesPath] : []),
    source.canonicalUrl,
  ]
  const result = await $`${config.media.ytDlpPath} ${args}`.nothrow().quiet()
  return {
    ok: result.exitCode === 0,
    stderr: lastLine(result.stderr.toString()),
    exitCode: result.exitCode,
  }
}

async function downloadWithYtDlp(
  source: ParsedSource,
  dir: string,
  cookiesPath: string | null,
): Promise<DownloadResult> {
  const pathFile = `${dir}/source.path`

  // The default client chain first — it resolves the richest format set,
  // and for every source but YouTube it is the only thing tried. Fallbacks
  // engage ONLY on a 403, so a private or deleted item still fails once
  // rather than being re-fetched under three more clients.
  let attempt = await runYtDlp(source, dir, pathFile, null, cookiesPath)
  for (const extractorArgs of config.media.ytDlpFallbacks[source.source] ??
    []) {
    if (attempt.ok || !CLIENT_REFUSED.test(attempt.stderr)) break
    logger.warn("Download refused, retrying on a fallback client", {
      source: source.source,
      item_id: source.itemId,
      extractor_args: extractorArgs,
    })
    attempt = await runYtDlp(source, dir, pathFile, extractorArgs, cookiesPath)
  }

  if (!attempt.ok) {
    const { stderr } = attempt
    // Checked BEFORE the login-shaped branch below. A 403 that survived
    // every fallback client is the GVS/SABR refusal of §1.1 — it means the
    // same thing whether or not a jar was supplied, so it must never be
    // reported as an expired session.
    if (CLIENT_REFUSED.test(stderr)) {
      // Every configured client refused. That is deterministic, so it is
      // classified permanent (src/lib/pipeline-errors.ts) instead of being
      // re-run by the queue to fail identically.
      throw new MediaIngestError(
        "SOURCE_UNAVAILABLE",
        `Could not fetch the media for this ${source.label} — the source refused every available client (HTTP 403). This often clears on its own; if it persists, the yt-dlp version may need updating.`,
      )
    }
    if (UNAVAILABLE.test(stderr)) {
      // The one bit of state that separates a dead video from a dead
      // session (SESSION_AUTH.md §4.3): we sent a signed-in jar and were
      // still told to log in. The message is OURS — `lastLine` puts 400
      // chars of raw stderr into the user-visible run.error, and a tool
      // that ever echoed a cookie into stderr would land it there.
      if (cookiesPath) {
        throw new MediaIngestError(
          "SESSION_EXPIRED",
          // `source.label` names one ITEM ("YouTube Short"); the thing
          // the user reconnects is the PLATFORM, which is what
          // providerLabel resolves a MediaSourceId to (a social
          // credential's provider IS the source id — SESSION_AUTH.md §2.4).
          `Your ${providerLabel(source.source)} session has expired. Reconnect it in the Vault to keep processing this source.`,
        )
      }
      throw new MediaIngestError(
        "SOURCE_UNAVAILABLE",
        `This ${source.label} isn't publicly downloadable — it may be private, age-restricted, removed, or require a signed-in session.`,
      )
    }
    // Include the exit code when stderr is empty — a bare "yt-dlp failed"
    // gives an operator nothing to act on.
    throw new MediaIngestError(
      "DOWNLOAD_FAILED",
      `Could not download this ${source.label}: ${stderr || `yt-dlp exited ${attempt.exitCode} with no output`}`,
    )
  }

  const mediaPath =
    (
      await Bun.file(pathFile)
        .text()
        .catch(() => "")
    )
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .pop() ?? ""
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

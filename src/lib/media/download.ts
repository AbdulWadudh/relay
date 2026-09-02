import { $ } from "bun"

import config from "@/config"
import { lastLine, MediaIngestError } from "@/lib/media/errors"
import type { ParsedSource } from "@/lib/media/sources"
import { logger } from "@/lib/observability/logger"
import { providerLabel } from "@/lib/providers"

/**
 * The download step (TRD §3 step 2): media into the run's temp directory,
 * plus the source metadata that lands in `additional_data`.
 *
 * ONE downloader for every source. Instagram briefly needed a second
 * (instaloader) because yt-dlp cannot reach Reels ANONYMOUSLY; with the
 * user's own jar it reaches them fine, so that toolchain is gone
 * (SESSION_AUTH.md §1.2, Branch B).
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

/**
 * Worth re-running on a different `player_client`. A SUPERSET of
 * CLIENT_REFUSED, and deliberately a separate pattern rather than more
 * alternatives bolted onto it.
 *
 * The two answer different questions. This one decides whether to KEEP
 * TRYING; CLIENT_REFUSED decides how to CLASSIFY what is left once every
 * client has failed. Merging them would let "sign in to confirm you're
 * not a bot" — bot detection, not an expired session — reach the 403
 * branch and be reported as a source that refused every client, or worse,
 * fall into the login-shaped branch below and burn a reject against a
 * credential that is perfectly alive.
 *
 * MEASURED 2026-09-02, against the video that failed in production: the
 * `tv` client returns "The page needs to be reloaded" for a Short that
 * `web_safari`, `web_embedded` and `mweb` all resolve. It matches neither
 * 403 nor the unavailable family, so the fallback chain never engaged and
 * a single client's quirk failed the whole run twice over.
 */
const CLIENT_RETRYABLE =
  /\b403\b|forbidden|page needs to be reloaded|not a bot|player response|failed to extract|requested format is not available|no video formats/i

/**
 * The format selector matched nothing THIS client offers.
 *
 * Load-bearing, and it must be tested BEFORE `UNAVAILABLE`: yt-dlp phrases
 * it "Requested format is not available", which contains the substring
 * "not available" and therefore matches the unavailable family. In
 * production that misfire reported a format-selection failure as
 * `SESSION_EXPIRED` — telling the user to reconnect a session that was
 * working, burning a reject against a credential they had just refreshed,
 * and classifying the run permanent so it never retried.
 *
 * It says NOTHING about the session or the item. Different player clients
 * expose different formats: measured 2026-09-02, `bestaudio/best` resolves
 * on web_safari, web_embedded and mweb but matches nothing on ios,
 * android_vr or tv_simply for the same video. So it is also in
 * CLIENT_RETRYABLE above — the right response is the NEXT client, not a
 * verdict on the credential.
 */
const FORMAT_MISSING = /requested format is not available|no video formats/i

/**
 * The source is challenging THIS SERVER as automated traffic.
 *
 * Also tested before `UNAVAILABLE`, and for the same reason FORMAT_MISSING
 * is: yt-dlp relays it as "Sign in to confirm you're not a bot", which
 * contains "sign in" and so matches the unavailable family. Left alone it
 * produces two lies — signed out, that a public video is private or
 * removed; signed IN, that the session expired, which also burns a reject
 * against a credential that is working perfectly.
 *
 * MEASURED 2026-09-02 from the production host, every configured client,
 * with and without a jar: signed out each one returned this message, and
 * signed in each returned "no formats" instead (the documented PO-token
 * symptom). The same video, binary and jar succeed from a residential
 * connection. So it is the server's address being refused, not the item,
 * and not the credential — which is what the message now says.
 */
const BOT_CHECK = /not a bot|confirm you.{0,4}re not a bot|too many requests/i

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
  // ONE downloader, for every source. Instagram used to route to
  // instaloader because yt-dlp could not reach Reels anonymously; now that
  // the user supplies their own jar, yt-dlp reaches them with it and
  // instaloader's second toolchain (Python + pip, ~120MB in the image)
  // bought nothing but a title. §1.2 measured both: same media, same
  // metadata, and the caption yt-dlp puts in `description` is exactly what
  // instaloader's `mapInfo` built its title from — see `withSyntheticTitle`.
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
  // engage only on a client-shaped failure, so a private or deleted item
  // still fails once rather than being re-fetched under three more clients.
  let attempt = await runYtDlp(source, dir, pathFile, null, cookiesPath)
  // Every client tried and what it said. A run that exhausts the chain
  // previously surfaced only the LAST stderr, which is why diagnosing the
  // `tv` failure took a local reproduction rather than a read of the logs.
  const attempts: string[] = [`default: ${attempt.ok ? "ok" : attempt.stderr}`]
  for (const extractorArgs of config.media.ytDlpFallbacks[source.source] ??
    []) {
    if (attempt.ok || !CLIENT_RETRYABLE.test(attempt.stderr)) break
    logger.warn("Download failed on this client, trying the next", {
      source: source.source,
      item_id: source.itemId,
      extractor_args: extractorArgs,
      // Never the URL or the jar — a client name and yt-dlp's own reason.
      previous_error: attempt.stderr.slice(0, 200),
    })
    attempt = await runYtDlp(source, dir, pathFile, extractorArgs, cookiesPath)
    attempts.push(`${extractorArgs}: ${attempt.ok ? "ok" : attempt.stderr}`)
  }

  if (!attempt.ok && attempts.length > 1) {
    logger.error("Every player client failed", {
      source: source.source,
      item_id: source.itemId,
      attempts: attempts.map((line) => line.slice(0, 200)),
    })
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
    // Also before the login-shaped branch. Never SESSION_EXPIRED: a jar
    // cannot answer a challenge aimed at the server's address, so counting
    // this against the credential would retire a working session.
    if (BOT_CHECK.test(stderr)) {
      throw new MediaIngestError(
        "SOURCE_UNAVAILABLE",
        `Could not fetch this ${source.label}: the source is challenging this server as automated traffic, not refusing the item itself. Your connected account is fine. This usually clears on its own; if it does not, the server's network is the thing to change.`,
      )
    }
    // BEFORE the login-shaped branch, and that order is the whole point:
    // "Requested format is not available" contains "not available", so
    // without this it falls into UNAVAILABLE and — because a jar was
    // supplied — is reported as an expired session.
    if (FORMAT_MISSING.test(stderr)) {
      throw new MediaIngestError(
        "SOURCE_UNAVAILABLE",
        `Could not fetch the media for this ${source.label} — no client offered a downloadable audio format. This is a source or extractor problem, not your session.`,
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

  const info = withSyntheticTitle(
    pruneInfo(
      await Bun.file(`${dir}/source.info.json`)
        .json()
        .catch(() => null),
    ),
  )
  return { mediaPath, info }
}

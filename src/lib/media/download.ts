import { $ } from "bun"

import config from "@/config"
import { classifyFailure, type YtDlpAttempt } from "@/lib/media/classify"
import { lastLine, MediaIngestError } from "@/lib/media/errors"
import {
  CLIENT_RETRYABLE,
  PROXY_UNREACHABLE,
} from "@/lib/media/failure-patterns"
import type { ParsedSource } from "@/lib/media/sources"
import { logger } from "@/lib/observability/logger"

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
  proxy: string,
): Promise<YtDlpAttempt> {
  // The three facts that describe this ONE invocation, derived once here
  // and carried on the returned attempt. The classifier needs them
  // per-attempt rather than per-run: whether a jar was actually sent is
  // what separates a dead session from a dead video, and whether the
  // proxy was actually in the path is what stops someone else's use of
  // the word "proxy" being read as our egress falling over.
  const client = extractorArgs ?? "default"
  const withCookies = Boolean(cookiesPath)
  const proxied = Boolean(proxy) && source.proxied

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
    // Whether to proxy is the SOURCE's property, read off the parsed
    // source, so this file still names no platform. Both halves must be
    // true: a source that wants a proxy but has none configured runs
    // direct rather than failing, which is what keeps the default
    // deployment and local development working untouched.
    ...(proxied ? ["--proxy", proxy] : []),
    source.canonicalUrl,
  ]
  const result = await $`${config.media.ytDlpPath} ${args}`.nothrow().quiet()
  const raw = result.stderr.toString()

  // yt-dlp's OWN output, into the run's log stream.
  //
  // WHY IT IS WORTH THE NOISE. `lastLine` keeps one line, which is the
  // right thing to SHOW a user but throws away the diagnosis: a run that
  // walks four player clients reports only the last client's complaint,
  // and the first client's failure — usually the interesting one — is
  // gone. The run detail view's stage log shows all of it.
  //
  // Scrubbed like everything else derived from this stderr, and capped:
  // yt-dlp can emit hundreds of lines and this is not a tool for reading
  // hundreds of lines.
  if (!result.exitCode) {
    logger.debug("yt-dlp finished", { client, proxied })
  } else {
    for (const line of raw
      .split("\n")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .slice(-12)) {
      logger.debug("yt-dlp", {
        client,
        line: scrubProxy(line).slice(0, 400),
      })
    }
  }

  return {
    ok: result.exitCode === 0,
    client,
    // Scrubbed HERE, at the single point stderr enters the program, rather
    // than at each of the places it leaves — `lastLine` output reaches the
    // user-visible `run.error`, the logs, and the attempts list, and one
    // missed call site would be a credential leak.
    stderr: scrubProxy(lastLine(raw)),
    exitCode: result.exitCode,
    proxied,
    withCookies,
  }
}

/**
 * Removes the proxy URL from anything derived from yt-dlp's output.
 *
 * yt-dlp echoes the proxy it was given when it cannot reach it — "Unable
 * to connect to proxy" carries the URL verbatim. `config.media.proxyUrl`
 * may legitimately be `socks5://user:pass@host`, and `lastLine`'s result
 * is stored on the run and shown to the user, so unscrubbed that puts a
 * credential on a page. Replaced with a fixed token so the failure is
 * still diagnosable as "the proxy", just not as "the proxy's password".
 */
export function scrubProxy(text: string): string {
  const proxy = config.media.proxyUrl
  if (!proxy) return text
  // The bare `host:port` is scrubbed as well as the full URL: yt-dlp and
  // the SOCKS layer below it report the endpoint in both shapes.
  const forms = [proxy, proxy.replace(/^[a-z0-9+.-]+:\/\//i, "")]
  return forms.reduce(
    (acc, form) => (form ? acc.split(form).join("[proxy]") : acc),
    text,
  )
}

async function downloadWithYtDlp(
  source: ParsedSource,
  dir: string,
  cookiesPath: string | null,
): Promise<DownloadResult> {
  const pathFile = `${dir}/source.path`
  const proxy = config.media.proxyUrl

  // Whether a proxy was used, never WHICH one — the URL can carry
  // credentials and is scrubbed everywhere else, so logging the boolean is
  // the whole diagnostic that is safe to keep. `proxied` is deliberately
  // not a key the logger redacts; `proxy` is.
  logger.debug("Download starting", {
    source: source.source,
    item_id: source.itemId,
    proxied: Boolean(proxy) && source.proxied,
  })

  // The default client chain first — it resolves the richest format set,
  // and for every source but YouTube it is the only thing tried. Fallbacks
  // engage only on a client-shaped failure, so a private or deleted item
  // still fails once rather than being re-fetched under three more clients.
  let attempt = await runYtDlp(source, dir, pathFile, null, cookiesPath, proxy)
  // Every client tried and what it said, kept as RECORDS rather than
  // pre-formatted strings, because the classification is taken from the
  // most informative of them (src/lib/media/classify.ts) and not from
  // whichever happened to run last. The tuple type carries "at least one"
  // into the classifier so it has no empty case to return null for.
  const attempts: [YtDlpAttempt, ...YtDlpAttempt[]] = [attempt]
  for (const extractorArgs of config.media.ytDlpFallbacks[source.source] ??
    []) {
    // An unreachable proxy is not a client problem, so re-running the same
    // fetch under three more player clients cannot fix it and only delays
    // the real error by however long each attempt takes to time out.
    if (
      attempt.ok ||
      PROXY_UNREACHABLE.test(attempt.stderr) ||
      !CLIENT_RETRYABLE.test(attempt.stderr)
    )
      break
    logger.warn("Download failed on this client, trying the next", {
      source: source.source,
      item_id: source.itemId,
      extractor_args: extractorArgs,
      // Never the URL or the jar — a client name and yt-dlp's own reason.
      previous_error: attempt.stderr.slice(0, 200),
    })
    attempt = await runYtDlp(
      source,
      dir,
      pathFile,
      extractorArgs,
      cookiesPath,
      proxy,
    )
    attempts.push(attempt)
  }

  if (!attempt.ok) {
    // Every client tried and what it said, before anything is thrown away.
    // A run that exhausts the chain used to surface only the LAST stderr,
    // which is why diagnosing the `tv` failure took a local reproduction
    // rather than a read of the logs.
    if (attempts.length > 1) {
      logger.error("Every player client failed", {
        source: source.source,
        item_id: source.itemId,
        attempts: attempts.map((entry) =>
          `${entry.client}: ${entry.stderr}`.slice(0, 200),
        ),
      })
    }

    // The verdict comes from the most informative attempt, not the last
    // one. The ladder, its order, and every guarantee that order buys live
    // in src/lib/media/classify.ts; this file only reports the outcome.
    const {
      error,
      attempt: deciding,
      cause,
    } = classifyFailure(attempts, source)
    logger.error("Download failed", {
      source: source.source,
      item_id: source.itemId,
      // WHICH attempt decided and WHY, so a report of the wrong cause can
      // be traced without reproducing the run: this is the exact pair that
      // was unavailable while classification read the last stderr.
      cause,
      deciding_client: deciding.client,
      code: error.code,
      proxied: deciding.proxied,
      // Scrubbed by `runYtDlp`, so this cannot carry the proxy's
      // credentials even though it is yt-dlp's own text.
      error: deciding.stderr.slice(0, 200),
    })
    throw error
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

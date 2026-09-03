import config from "@/config"
import { classifyFailure, type YtDlpAttempt } from "@/lib/media/classify"
import { MediaIngestError } from "@/lib/media/errors"
import {
  CLIENT_RETRYABLE,
  PROXY_UNREACHABLE,
  UNAVAILABLE,
} from "@/lib/media/failure-patterns"
import { pruneInfo, withSyntheticTitle } from "@/lib/media/info"
import type { ParsedSource } from "@/lib/media/sources"
import { runYtDlp } from "@/lib/media/ytdlp"
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

  // WHICH SESSION, AND IN WHAT ORDER.
  //
  // For a source whose public items need no session, anonymous goes FIRST
  // and the jar is only spent on an item that actually needs it. That is
  // not a preference: measured 2026-09-03, a YouTube jar that had gone bad
  // failed EVERY player client for four hours, and because the jar was
  // tried first and alone, one dead session took down all YouTube
  // ingestion. Anonymous took the same four links immediately.
  //
  // Instagram is the other way round and gets NO anonymous attempt: it
  // cannot reach Reels without a jar at all (SESSION_AUTH.md 1.2), so an
  // anonymous try is pure waste -- and keeping the jar attempt FIRST is
  // what preserves SESSION_EXPIRED detection, since equal-ranked attempts
  // keep the earliest and only a jar attempt can resolve to it.
  const sessions: readonly (string | null)[] =
    cookiesPath && source.publicAnonymously
      ? [null, cookiesPath]
      : [cookiesPath]

  const attempts: YtDlpAttempt[] = []
  let attempt!: YtDlpAttempt
  for (const [index, jar] of sessions.entries()) {
    if (index > 0) {
      logger.warn("Retrying with a different session", {
        source: source.source,
        item_id: source.itemId,
        with_jar: jar !== null,
        previous_error: attempt.stderr.slice(0, 200),
      })
    }
    attempt = await attemptClientChain(
      source,
      dir,
      pathFile,
      jar,
      proxy,
      attempts,
    )
    if (attempt.ok) break
    // Our own egress being down says nothing a different session can fix.
    if (PROXY_UNREACHABLE.test(attempt.stderr)) break
    // Only a failure a different session could plausibly change is worth
    // another pass: a client-shaped refusal, or the unavailable family --
    // which is exactly what a signed-in fetch answers for a private or
    // age-restricted item, and what a bad jar reports for a public one.
    if (
      !CLIENT_RETRYABLE.test(attempt.stderr) &&
      !UNAVAILABLE.test(attempt.stderr)
    )
      break
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
    // `sessions` is non-empty by construction and every pass pushes at
    // least one attempt, so this is never the empty array the tuple
    // forbids — asserted rather than guarded, to keep the dead branch the
    // tuple exists to prevent from reappearing here.
    const collected = attempts as [YtDlpAttempt, ...YtDlpAttempt[]]
    const {
      error,
      attempt: deciding,
      cause,
    } = classifyFailure(collected, source)
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

/**
 * The default client, then each configured fallback, for ONE session.
 * Appends every attempt to `attempts` so the classifier sees all of them.
 */
async function attemptClientChain(
  source: ParsedSource,
  dir: string,
  pathFile: string,
  cookiesPath: string | null,
  proxy: string,
  attempts: YtDlpAttempt[],
): Promise<YtDlpAttempt> {
  // The default client first — it resolves the richest format set, and for
  // every source but YouTube it is the only thing tried.
  let attempt = await runYtDlp(source, dir, pathFile, null, cookiesPath, proxy)
  attempts.push(attempt)

  for (const extractorArgs of config.media.ytDlpFallbacks[source.source] ??
    []) {
    // An unreachable proxy is not a client problem, so re-running the same
    // fetch under more player clients cannot fix it.
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
  return attempt
}

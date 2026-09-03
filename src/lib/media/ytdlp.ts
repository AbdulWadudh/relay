import { $ } from "bun"

import config from "@/config"
import type { YtDlpAttempt } from "@/lib/media/classify"
import { lastLine } from "@/lib/media/errors"
import type { ParsedSource } from "@/lib/media/sources"
import { logger } from "@/lib/observability/logger"

/**
 * ONE yt-dlp invocation, and the scrubbing of what it says.
 *
 * Split out of `src/lib/media/download.ts`, which was over the 250-line
 * cap. That file owns the STRATEGY -- which clients to try, in what order,
 * and what to conclude. This owns the CALL: the argument list, the per-
 * attempt facts the classifier needs, and the single point at which the
 * proxy URL is stripped out of anything derived from stderr.
 */

/**
 * What to fetch, when it is not the default audio stream. The frames path
 * wants video-only at a modest resolution and no info JSON (the audio
 * download already stored it), so those are the only two knobs.
 */
export interface YtDlpFetch {
  format: string
  /** yt-dlp `-S`, which is how a resolution TARGET is expressed. */
  formatSort?: string
  /** Basename inside `dir`; the extension stays yt-dlp's own. */
  outputName?: string
  writeInfoJson?: boolean
}

export async function runYtDlp(
  source: ParsedSource,
  dir: string,
  pathFile: string,
  extractorArgs: string | null,
  cookiesPath: string | null,
  proxy: string,
  fetch: YtDlpFetch = { format: "bestaudio/best", writeInfoJson: true },
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

  const potProvider = config.media.potProviderUrl

  // A newline inside a Bun `$` template is a command separator, so the
  // invocation stays one line and passes its arguments as an array — each
  // element is escaped into exactly one argv entry.
  const args = [
    "--no-playlist",
    "--no-warnings",
    "--no-progress",
    "--no-simulate",
    "-f",
    fetch.format,
    ...(fetch.formatSort ? ["-S", fetch.formatSort] : []),
    "-o",
    `${dir}/${fetch.outputName ?? "source"}.%(ext)s`,
    ...(fetch.writeInfoJson ? ["--write-info-json"] : []),
    // `after_move:` resolves after yt-dlp renames the file to its final
    // name; the default (`video:`) prints "NA" because it runs too early.
    "--print-to-file",
    "after_move:%(filepath)s",
    pathFile,
    ...(extractorArgs ? ["--extractor-args", extractorArgs] : []),
    // The proof-of-origin token provider, on EVERY invocation once it is
    // configured -- the plugin decides when a token is actually needed,
    // and for the clients that need one, not having it is the difference
    // between formats and no formats.
    //
    // `--extractor-args` is repeatable, so this composes with the player
    // client above rather than replacing it (verified: both are honoured
    // in one invocation). The key is namespaced to the plugin, so it is
    // inert for a source that is not YouTube -- which is why there is no
    // platform check here, and this file still names no platform
    // (RULES.md).
    ...(potProvider
      ? ["--extractor-args", `youtubepot-bgutilhttp:base_url=${potProvider}`]
      : []),
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

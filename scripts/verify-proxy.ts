import config from "@/config"

import { scrubProxy } from "@/lib/media/download"
import { isSensitiveKey, redactLogValue } from "@/lib/observability/logger"

/**
 * Canary for the egress proxy's credential-leak paths — `bun run
 * verify:proxy`.
 *
 * WHY THIS EXISTS. `config.media.proxyUrl` is the first configuration
 * value that is BOTH a secret and echoed back by a subprocess. yt-dlp
 * prints the proxy it was handed when it cannot reach it, and
 * `lastLine`'s output is stored on the run and rendered to the user, so
 * an unscrubbed failure puts `socks5://user:pass@host` on a page. The
 * acceptance bar was that this is SHOWN, not asserted.
 *
 * WHAT IT CHECKS. Real yt-dlp failure text, with a real credentialed
 * proxy URL substituted in, through the exact functions the pipeline
 * uses. It does not mock anything and it does not test that the regex
 * "looks right" — it looks for the password in the output.
 *
 * WHY THE ENV COMES FROM THE SCRIPT ENTRY. `config` reads `process.env`
 * at import time and imports are hoisted, so assigning
 * `process.env.MEDIA_PROXY_URL` anywhere in this file would run too late
 * — `config.media.proxyUrl` would already be "" and `scrubProxy` would
 * short-circuit, passing every check while testing nothing. The canary
 * value is therefore set by the `verify:proxy` script in package.json,
 * and the `armed` guard at the bottom fails loudly if it did not arrive.
 */

/** Never a real credential — a canary token that is easy to grep for. */
const CANARY_PASSWORD = "s3cr3t-canary-do-not-ship"
const CANARY_PROXY = `socks5://relay:${CANARY_PASSWORD}@warp.internal:1080`

/**
 * Verbatim shapes yt-dlp and the SOCKS layer beneath it emit, with the
 * proxy interpolated where the tool puts it. Collected from real failures
 * rather than invented: a killed sidecar, a wrong port, and a refused
 * tunnel each phrase it differently, and the bare `host:port` form in the
 * last one is why `scrubProxy` strips the scheme-less variant too.
 */
const FAILURE_SHAPES = [
  `ERROR: Unable to download webpage: <urlopen error Unable to connect to proxy ${CANARY_PROXY}>`,
  `ERROR: unable to download video data: Unable to connect to proxy ${CANARY_PROXY}: [Errno 111] Connection refused`,
  `ERROR: Unable to download webpage: SOCKS5 proxy server sent invalid data (caused by TransportError); proxy=${CANARY_PROXY}`,
  `ERROR: Unable to connect to proxy warp.internal:1080`,
  `ERROR: tunnel connection failed: 403 Forbidden via relay:${CANARY_PASSWORD}@warp.internal:1080`,
]

interface Check {
  name: string
  leaked: boolean
  detail: string
}

const checks: Check[] = []

for (const [index, shape] of FAILURE_SHAPES.entries()) {
  const scrubbed = scrubProxy(shape)
  checks.push({
    name: `stderr shape ${index + 1} -> run.error`,
    leaked: scrubbed.includes(CANARY_PASSWORD),
    detail: scrubbed,
  })
}

/**
 * The log path is separate from the stderr path and can leak on its own:
 * the download step logs a `proxied` BOOLEAN precisely so the URL never
 * enters a log record, but a future edit that logs `proxy_url` instead
 * has to be caught by the redactor. Both halves are checked — the key
 * that must be hidden, and the key that must SURVIVE, since a redactor
 * that hides everything would pass a leak test while destroying the
 * diagnostic.
 */
const logRecord = redactLogValue({
  source: "youtube",
  proxied: true,
  proxy: CANARY_PROXY,
  proxy_url: CANARY_PROXY,
  error: scrubProxy(FAILURE_SHAPES[1] ?? ""),
})
const serialized = JSON.stringify(logRecord)

checks.push({
  name: "log record -> OpenObserve",
  leaked: serialized.includes(CANARY_PASSWORD),
  detail: serialized,
})
checks.push({
  name: "`proxied` boolean survives redaction (diagnostic intact)",
  leaked: (logRecord as Record<string, unknown>).proxied !== true,
  detail: `proxied=${String((logRecord as Record<string, unknown>).proxied)}`,
})
checks.push({
  name: "`proxy` is classified sensitive, `proxied` is not",
  leaked: !isSensitiveKey("proxy") || isSensitiveKey("proxied"),
  detail: `proxy=${isSensitiveKey("proxy")} proxied=${isSensitiveKey("proxied")}`,
})

/**
 * Guards the canary itself. `scrubProxy` short-circuits when no proxy is
 * configured, so if `config.media.proxyUrl` were empty here every check
 * above would pass while testing nothing at all.
 */
const armed = config.media.proxyUrl === CANARY_PROXY

console.log(
  `\nEgress proxy leak canary — ${armed ? "ARMED" : "NOT ARMED"} (config.media.proxyUrl ${armed ? "is the canary" : "did not take the canary value"})\n`,
)
for (const check of checks) {
  console.log(
    `  ${check.leaked ? "LEAK " : "clean"}  ${check.name}\n         ${check.detail.slice(0, 160)}`,
  )
}

const leaks = checks.filter((check) => check.leaked)
if (!armed || leaks.length > 0) {
  console.error(
    `\nFAIL — ${!armed ? "canary not armed" : `${leaks.length} leak path(s)`}. The proxy URL can reach a user-visible error or a log sink.\n`,
  )
  process.exit(1)
}
console.log(
  `\nPASS — ${checks.length} paths checked, the proxy credential reached none of them.\n`,
)

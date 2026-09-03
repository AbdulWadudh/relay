import { MediaIngestError } from "@/lib/media/errors"
import {
  BOT_CHECK,
  CLIENT_REFUSED,
  FORMAT_MISSING,
  PROXY_UNREACHABLE,
  UNAVAILABLE,
} from "@/lib/media/failure-patterns"
import type { ParsedSource } from "@/lib/media/sources"
import { providerLabel } from "@/lib/providers"

/**
 * Turns a run's collected yt-dlp attempts into the ONE failure the user
 * and the queue are told about.
 *
 * WHY THIS IS NOT A CHAIN OF `if`s ON THE LAST STDERR, which is what it
 * used to be. A YouTube fetch walks the default client and then each entry
 * in `config.media.ytDlpFallbacks`, and the clients do not fail in order
 * of usefulness. Measured shape of the production failure: the default
 * client returns 403 — the diagnosis — and a later client returns
 * "Requested format is not available", which says nothing about anything.
 * Keeping the last stderr therefore reported a CDN refusal as an extractor
 * problem, and §5 of RUNBOOK.md (bump the yt-dlp pin) was never reached.
 *
 * So the ladder is applied to EVERY attempt and the attempt whose failure
 * lands on the highest rung decides. The order of the rungs is unchanged,
 * and it is the whole design — see each rung below and the pattern
 * comments in src/lib/media/failure-patterns.ts.
 */

/**
 * One yt-dlp invocation, and everything classifying it needs to know.
 *
 * `proxied` and `withCookies` are recorded PER ATTEMPT rather than read
 * off the surrounding download, because two rungs are conditional on them
 * and they are conditions about the attempt that actually failed. In
 * particular a failure must never resolve to `SESSION_EXPIRED` unless the
 * attempt being classified genuinely SENT a jar and was refused anyway.
 */
export interface YtDlpAttempt {
  ok: boolean
  /** Which player client ran. yt-dlp's own default chain is "default". */
  client: string
  /** Last stderr line — the line carrying the actual reason. Scrubbed. */
  stderr: string
  exitCode: number
  /** Whether `--proxy` was actually applied to THIS invocation. */
  proxied: boolean
  /** Whether the user's jar was actually handed to THIS invocation. */
  withCookies: boolean
}

interface Rung {
  /** Stable id, logged so an operator can see which rung decided. */
  id: string
  matches: (attempt: YtDlpAttempt) => boolean
  resolve: (attempt: YtDlpAttempt, source: ParsedSource) => MediaIngestError
}

/**
 * Most informative first. Position is load-bearing: several of these
 * messages overlap textually, and a lower rung claiming an attempt that a
 * higher rung would also claim is exactly the misreport this ladder
 * exists to prevent.
 */
const LADDER: readonly Rung[] = [
  {
    // FIRST, ahead of every source-shaped rung. Our own egress being down
    // says nothing about the item and nothing about the jar, so it must
    // not reach SESSION_EXPIRED (which would burn a reject against a
    // living credential) or the permanent 403 rung (which would stop the
    // queue retrying something a sidecar restart fixes).
    //
    // DOWNLOAD_FAILED is deliberate: it is the one code the queue treats
    // as retryable, and a proxy outage is the textbook retryable failure.
    //
    // Guarded on the attempt's OWN `proxied`, so a source that goes direct
    // can never be diagnosed as a proxy outage on the strength of the word
    // "proxy" appearing in someone else's error text.
    id: "proxy-unreachable",
    matches: (attempt) =>
      attempt.proxied && PROXY_UNREACHABLE.test(attempt.stderr),
    resolve: (_attempt, source) =>
      new MediaIngestError(
        "DOWNLOAD_FAILED",
        `Could not fetch this ${source.label}: this server's outbound proxy is unavailable. Nothing is wrong with the link or your connected account — this will retry on its own.`,
      ),
  },
  {
    // Above the login-shaped rung. A 403 is the GVS/SABR refusal of §1.1 —
    // it means the same thing whether or not a jar was supplied, so it
    // must never be reported as an expired session. Deterministic, so it
    // is classified permanent (src/lib/pipeline-errors.ts) rather than
    // re-run by the queue to fail identically.
    id: "client-refused",
    matches: (attempt) => CLIENT_REFUSED.test(attempt.stderr),
    resolve: (_attempt, source) =>
      new MediaIngestError(
        "SOURCE_UNAVAILABLE",
        `Could not fetch the media for this ${source.label} — the source refused this server with HTTP 403, and no other client succeeded either. This often clears on its own; if it persists, the yt-dlp version may need updating.`,
      ),
  },
  {
    // Also above the login-shaped rung. Never SESSION_EXPIRED: a jar
    // cannot answer a challenge aimed at the server's address, so counting
    // this against the credential would retire a working session.
    //
    // DOWNLOAD_FAILED, so the queue retries it -- the same reasoning as
    // `egress-degraded` below, which is this failure's other half. A
    // challenge is aimed at an ADDRESS, and an address stops being
    // flagged; SOURCE_UNAVAILABLE classifies PERMANENT
    // (src/lib/pipeline-errors.ts) and would never try again.
    //
    // MEASURED 2026-09-04, and it is why this rung changed: a Short that
    // failed all six attempts in production (three anonymous, three with a
    // jar, all proxied) downloaded 641KB on the DEFAULT client from a
    // residential connection -- same yt-dlp build, same format selector,
    // minutes apart. Nothing about the item was permanent. The old
    // classification told the user it "usually clears on its own" and then
    // guaranteed it could not, which is the contradiction this fixes.
    id: "bot-check",
    matches: (attempt) => BOT_CHECK.test(attempt.stderr),
    resolve: (_attempt, source) =>
      new MediaIngestError(
        "DOWNLOAD_FAILED",
        `Could not fetch this ${source.label}: the source is challenging this server as automated traffic, not refusing the item itself. Your connected account is fine. This will retry on its own; if it keeps happening, the server's network is the thing to change.`,
      ),
  },
  {
    // Ranked above `format-missing`, and the per-attempt flags ARE the
    // diagnosis: this attempt went through OUR proxy, sent NO jar, and
    // still got no formats. Measured 2026-09-03, anonymous on the same
    // pinned yt-dlp takes those same links from a residential connection
    // — so the variable left is this server's egress, not the item and
    // not the credential.
    //
    // DOWNLOAD_FAILED, so the queue retries it: an exit address being
    // refused is transient, where SOURCE_UNAVAILABLE is classified
    // permanent (src/lib/pipeline-errors.ts) and would never retry.
    id: "egress-degraded",
    matches: (attempt) =>
      attempt.proxied &&
      !attempt.withCookies &&
      FORMAT_MISSING.test(attempt.stderr),
    resolve: (_attempt, source) =>
      new MediaIngestError(
        "DOWNLOAD_FAILED",
        `Could not fetch the media for this ${source.label} — no client offered a downloadable audio format, including an anonymous retry. Nothing is wrong with the link or your connected account; this server's network is the likely cause, and it will retry.`,
      ),
  },
  {
    // Above the login-shaped rung, and that order is the whole point:
    // "Requested format is not available" contains "not available", so
    // without this it falls into UNAVAILABLE and — where a jar was
    // supplied — is reported as an expired session.
    id: "format-missing",
    matches: (attempt) => FORMAT_MISSING.test(attempt.stderr),
    resolve: (_attempt, source) =>
      new MediaIngestError(
        "SOURCE_UNAVAILABLE",
        `Could not fetch the media for this ${source.label} — no client offered a downloadable audio format. This is a source or extractor problem, not your session.`,
      ),
  },
  {
    id: "unavailable",
    matches: (attempt) => UNAVAILABLE.test(attempt.stderr),
    resolve: (attempt, source) =>
      // The one bit of state that separates a dead video from a dead
      // session (SESSION_AUTH.md §4.3): THIS attempt sent a signed-in jar
      // and was still told to log in. The message is OURS — `lastLine`
      // puts 400 chars of raw stderr into the user-visible run.error, and
      // a tool that ever echoed a cookie into stderr would land it there.
      attempt.withCookies
        ? new MediaIngestError(
            "SESSION_EXPIRED",
            // `source.label` names one ITEM ("YouTube Short"); the thing
            // the user reconnects is the PLATFORM, which is what
            // providerLabel resolves a MediaSourceId to (a social
            // credential's provider IS the source id — SESSION_AUTH.md §2.4).
            `Your ${providerLabel(source.source)} session has expired. Reconnect it in the Vault to keep processing this source.`,
          )
        : new MediaIngestError(
            "SOURCE_UNAVAILABLE",
            `This ${source.label} isn't publicly downloadable — it may be private, age-restricted, removed, or require a signed-in session.`,
          ),
  },
]

/**
 * How informative one attempt's failure is: the index of the first rung
 * that claims it, or `LADDER.length` for a failure no rung recognises.
 * LOWER IS MORE INFORMATIVE.
 */
function rank(attempt: YtDlpAttempt): number {
  const index = LADDER.findIndex((rung) => rung.matches(attempt))
  return index === -1 ? LADDER.length : index
}

export interface Classification {
  error: MediaIngestError
  /** The attempt the verdict was taken from. */
  attempt: YtDlpAttempt
  /** Which rung decided, or "unrecognised" for the fallback. */
  cause: string
}

/**
 * Picks the most informative failed attempt and classifies it.
 *
 * TIE-BREAK: strictly-lower rank wins over an EARLIER candidate, so
 * equal-ranked attempts keep the first. The default client runs first and
 * resolves the richest format set, so where two clients say the same kind
 * of thing its wording is the one worth showing — and a run whose attempts
 * all land on one rung gets the same code and the same message either way.
 *
 * Successful attempts are skipped, so a fetch that eventually worked can
 * never be classified off an earlier client's noise. The non-empty tuple
 * is what makes the return non-nullable: `download` only calls this with
 * the attempts it actually made, and there is always at least one.
 */
export function classifyFailure(
  attempts: readonly [YtDlpAttempt, ...YtDlpAttempt[]],
  source: ParsedSource,
): Classification {
  const failures = attempts.filter((attempt) => !attempt.ok)
  // The last attempt is what this used to classify unconditionally; it is
  // the fallback for the case the caller should never produce — every
  // attempt succeeded — so that this function has no null return to force
  // a dead branch on the caller.
  let best = failures.at(0) ?? attempts[attempts.length - 1]
  let bestRank = rank(best)
  for (const attempt of failures) {
    const attemptRank = rank(attempt)
    if (attemptRank < bestRank) {
      best = attempt
      bestRank = attemptRank
    }
  }

  const rung = bestRank < LADDER.length ? LADDER[bestRank] : null
  if (rung) {
    return { error: rung.resolve(best, source), attempt: best, cause: rung.id }
  }
  // No rung recognised it. Include the exit code when stderr is empty — a
  // bare "yt-dlp failed" gives an operator nothing to act on.
  return {
    error: new MediaIngestError(
      "DOWNLOAD_FAILED",
      `Could not download this ${source.label}: ${best.stderr || `yt-dlp exited ${best.exitCode} with no output`}`,
    ),
    attempt: best,
    cause: "unrecognised",
  }
}

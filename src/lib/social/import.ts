import { providerLabel } from "@/lib/providers"
import {
  isComplete,
  type SerializedJar,
  toNetscapeJar,
} from "@/lib/social/cookies"
import type { CapturedCookie, SocialProvider } from "@/lib/social/providers"

/**
 * Parses a cookies.txt file the USER exported from their own browser
 * (SESSION_AUTH.md §2) and cleans it down to one provider's session.
 *
 * This replaced the server-side capture browser. The reason is not
 * preference: Google refuses sign-in from any CDP-attached browser ("This
 * browser or app may not be secure"), so a server-driven YouTube login can
 * never work, and shipping Chromium to make Instagram work cost ~400MB on
 * every deploy.
 *
 * NOTHING HERE MAY BE LOGGED. The input is a bearer token for the user's
 * entire social account — strictly more dangerous than an API key.
 *
 * "Cleaning" is the whole job, and it is not cosmetic. A user following the
 * instructions may well export EVERY cookie in their browser, including
 * their bank and their email. Three filters run before anything is stored:
 * out-of-scope domains are dropped (`toNetscapeJar`), expired cookies are
 * dropped here, and the result must still satisfy `isComplete` or it is
 * refused. Anything that survives is, by construction, on the provider's
 * own domains.
 */

/** A refusal the user can act on. `message` is shown to them verbatim. */
export class CookieImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CookieImportError"
  }
}

export interface ImportedJar extends SerializedJar {
  /** Generic `account_*` keys from the registry. Never a cookie value. */
  account: Record<string, unknown>
  /** In-scope, unexpired cookies kept. Counts only — never names of others. */
  kept: number
  /**
   * Cookies dropped for being on someone else's domain. Surfaced to the
   * user because "we discarded 214 cookies" is the reassurance that makes
   * pasting a whole-browser export defensible.
   */
  discarded: number
}

/**
 * One Netscape line: domain, includeSubdomains, path, secure, expires,
 * name, value — tab separated.
 *
 * A value may legitimately be empty and may contain characters that look
 * like separators, so the tail is rejoined rather than truncated at seven
 * fields. A line with FEWER than seven is malformed and skipped.
 */
function parseLine(line: string): CapturedCookie | null {
  // `#HttpOnly_` is a real cookie, not a comment. Checked before the
  // comment test, because getting this backwards silently drops the
  // session: Instagram's `sessionid` and YouTube's `__Secure-3PSID` are
  // both HttpOnly.
  const httpOnly = line.startsWith("#HttpOnly_")
  if (!httpOnly && (line.startsWith("#") || line.trim() === "")) return null

  const fields = (httpOnly ? line.slice("#HttpOnly_".length) : line).split("\t")
  if (fields.length < 7) return null

  const [domain, , path, secure, expires, name] = fields
  if (!domain || !name) return null

  const expiresAt = Number(expires)
  return {
    name,
    value: fields.slice(6).join("\t"),
    domain,
    path: path || "/",
    // The format writes 0 for a session cookie; the CDP shape this feeds
    // uses -1. Both serialize back to 0, but keep the contract honest.
    expires: Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : -1,
    httpOnly,
    secure: secure === "TRUE",
  }
}

/** True once a cookie's own expiry has passed. Session cookies never expire. */
function isExpired(cookie: CapturedCookie): boolean {
  return cookie.expires > 0 && cookie.expires * 1000 <= Date.now()
}

function parseAll(text: string): CapturedCookie[] {
  const cookies: CapturedCookie[] = []
  for (const line of text.split(/\r?\n/)) {
    const cookie = parseLine(line)
    // Dropped here rather than at validation so that an export whose
    // session cookie has already lapsed fails as "not signed in", which is
    // both true and actionable, instead of "wrong format".
    if (cookie && !isExpired(cookie)) cookies.push(cookie)
  }
  return cookies
}

/**
 * Every failure mode below is one a user following the instructions will
 * actually hit, so each gets its own sentence telling them what to change.
 * A generic "invalid file" would send them back to guess.
 */
export function importJar(text: string, provider: SocialProvider): ImportedJar {
  // RULES.md: labels live in src/lib/providers.ts and nowhere else, so the
  // registry entry carries the id and the label is resolved from it.
  const label = providerLabel(provider.name)
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    throw new CookieImportError("That file is empty.")
  }

  // The most common wrong turn by far: Cookie-Editor and friends default to
  // a JSON export. Naming the fix beats "no cookies found".
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    throw new CookieImportError(
      "That's a JSON export. Re-export using the Netscape / cookies.txt format instead.",
    )
  }

  const parsed = parseAll(trimmed)
  if (parsed.length === 0) {
    throw new CookieImportError(
      "No cookies could be read from that file. Make sure you exported in the Netscape / cookies.txt format.",
    )
  }

  // `toNetscapeJar` applies the domain allowlist, so `cookieNames` is the
  // in-scope set and everything else is already gone.
  const jar = toNetscapeJar(parsed, provider)
  if (jar.cookieNames.length === 0) {
    throw new CookieImportError(
      `That file has no ${label} cookies in it. Export it from a tab that is signed in to ${label}.`,
    )
  }

  if (!isComplete(parsed, provider)) {
    // Names only. These are registry constants, not secrets — and telling
    // the user WHICH cookie is missing is the difference between fixing it
    // and giving up.
    const present = new Set(jar.cookieNames)
    const missing = provider.sessionCookies.filter((name) => !present.has(name))
    throw new CookieImportError(
      `That export is missing your ${label} session (${missing.join(", ")}). Sign in to ${label} in that browser, reload the page, then export again.`,
    )
  }

  return {
    ...jar,
    account: provider.mapAccount(parsed),
    kept: jar.cookieNames.length,
    discarded: parsed.length - jar.cookieNames.length,
  }
}

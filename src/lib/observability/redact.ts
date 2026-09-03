/**
 * Log redaction, split out of logger.ts so the tee in
 * `run-log-stream.ts` can use it without importing the logger it feeds
 * (which would close an import cycle).
 */

/**
 * Field names whose values must never reach a log sink (RULES.md, PRD §6:
 * zero plaintext token exposure).
 *
 * Matched per WORD, not per raw substring, so "monkey" is not treated as a
 * key and "encoded" is not treated as a code. `isSensitiveKey` splits
 * camelCase before comparing — the previous regex only handled
 * `_`-delimited segments, which meant `accessToken` (the exact field name
 * `credentialInputSchema` uses) sailed through unredacted and every
 * POST /credentials wrote the user's raw API key to OpenObserve.
 */
const SENSITIVE_WORDS = new Set([
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "code",
  "key",
  "apikey",
  "credential",
  "credentials",
  // An egress proxy URL may carry `user:pass@` (config.media.proxyUrl), so
  // any key that IS the proxy is redacted. Deliberately does not catch
  // `proxied`, which is the boolean the download step logs instead — the
  // useful half of the diagnostic without the half that can hold a secret.
  "proxy",
])

export function isSensitiveKey(key: string): boolean {
  return (
    key
      // camelCase / PascalCase -> word boundaries
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .some((word) => SENSITIVE_WORDS.has(word))
  )
}

export function redactLogValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactLogValue)
  if (!value || typeof value !== "object") return value
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? "[REDACTED]" : redactLogValue(item),
    ]),
  )
}

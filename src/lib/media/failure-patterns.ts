/**
 * The shapes a failed media fetch comes back in, and nothing else.
 *
 * Split out of src/lib/media/download.ts so the classification ladder in
 * src/lib/media/classify.ts can own the DECISION while these keep owning
 * the EVIDENCE. Every comment here is a measurement someone paid for once;
 * they are the reason the ladder's order is what it is.
 *
 * Provider-generic on purpose — these match on what a tool SAID, never on
 * which platform said it (RULES.md).
 */

/**
 * yt-dlp reports private, deleted, rate-limited and login-gated items
 * through the same "not available" family of messages — they're one
 * user-facing outcome ("we can't reach this"), distinct from a genuine
 * tool failure that an operator needs to see verbatim.
 */
export const UNAVAILABLE =
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
export const CLIENT_REFUSED = /\b403\b|forbidden/i

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
export const CLIENT_RETRYABLE =
  /\b403\b|forbidden|page needs to be reloaded|not a bot|player response|failed to extract|requested format is not available|no video formats/i

/**
 * The format selector matched nothing THIS client offers.
 *
 * Load-bearing, and it must be RANKED BELOW `CLIENT_REFUSED` and
 * `BOT_CHECK` and ABOVE `UNAVAILABLE`: yt-dlp phrases it "Requested
 * format is not available", which contains the substring "not available"
 * and therefore matches the unavailable family. In production that
 * misfire reported a format-selection failure as `SESSION_EXPIRED` —
 * telling the user to reconnect a session that was working, burning a
 * reject against a credential they had just refreshed, and classifying
 * the run permanent so it never retried.
 *
 * It says NOTHING about the session or the item. Different player clients
 * expose different formats: measured 2026-09-02, `bestaudio/best` resolves
 * on web_safari, web_embedded and mweb but matches nothing on ios,
 * android_vr or tv_simply for the same video. So it is also in
 * CLIENT_RETRYABLE above — the right response is the NEXT client, not a
 * verdict on the credential.
 *
 * It is also the LEAST informative thing a client can say, which is why
 * the ladder is applied across every attempt rather than to the last one:
 * a late client reporting this used to overwrite an earlier client's 403.
 */
export const FORMAT_MISSING =
  /requested format is not available|no video formats/i

/**
 * The source is challenging THIS SERVER as automated traffic.
 *
 * Also ranked above `UNAVAILABLE`, and for the same reason FORMAT_MISSING
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
export const BOT_CHECK =
  /not a bot|confirm you.{0,4}re not a bot|too many requests/i

/**
 * OUR OWN egress proxy is down or refusing, which is infrastructure — the
 * item is fine, the session is fine, and nothing about the source has been
 * learned. Distinct from every pattern above, all of which are things a
 * SOURCE said; this is a failure that happened before the source was ever
 * reached.
 *
 * Ranked FIRST, ahead of CLIENT_REFUSED, because the SOCKS layer reports a
 * refused tunnel as a 403 in some yt-dlp versions. Read as CLIENT_REFUSED
 * that would be classified permanent (see src/lib/pipeline-errors.ts) and
 * the run would never retry — so a sidecar restart of a few seconds would
 * permanently fail every run overlapping it, which is precisely the
 * failure a queue exists to absorb.
 */
export const PROXY_UNREACHABLE =
  /proxy|socks|tunnel connection failed|cannot connect to proxy/i

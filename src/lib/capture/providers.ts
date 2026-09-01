import { MEDIA_SOURCES, type MediaSourceId } from "@/lib/media/sources"

/**
 * Capture provider registry (SESSION_AUTH.md §2.4).
 *
 * The exact analogue of src/server/ray-providers.ts: the flow is generic
 * and every provider-specific concept is mapped HERE onto the shared
 * vocabulary, so no source string appears in the capture routes, the
 * session manager, or the UI (RULES.md:57-58).
 *
 * Keyed by `MediaSourceId`, so a social credential's `provider` IS the
 * media source id and download-time lookup needs no mapping table.
 */

export interface CaptureProvider {
  name: MediaSourceId
  /** Where the capture browser lands. */
  loginUrl: string
  /**
   * The session is complete once ALL of these cookies exist. Names only —
   * a cookie VALUE must never appear in code, config, logs or meta_data.
   */
  sessionCookies: readonly string[]
  /** Only cookies on these domains are harvested; everything else is dropped. */
  cookieDomains: readonly string[]
  /**
   * Visited immediately before harvesting, to settle the session onto a
   * stable cookie set.
   *
   * This is not decoration: yt-dlp's own wiki requires exporting YouTube
   * cookies from a page like robots.txt and then never reopening the
   * session, because reopening rotates the refresh token and invalidates
   * what was exported (SESSION_AUTH.md §4.2b).
   */
  settleUrl?: string
  /**
   * CONTRACT, identical to RayProvider.mapMetaData: MUST return the
   * generic `account_*` keys. Provider vocabulary is translated here and
   * nowhere else. Cookie VALUES must never be returned — meta_data is
   * plaintext and is served to the browser by GET /credentials.
   */
  mapAccount: (
    cookies: readonly CapturedCookie[],
  ) => Record<string, unknown> & { account_id?: string; account_name?: string }
}

/** A cookie as CDP's `Storage.getCookies` reports it. */
export interface CapturedCookie {
  name: string
  value: string
  domain: string
  path: string
  /** Seconds since epoch; -1 for a session cookie. */
  expires: number
  httpOnly: boolean
  secure: boolean
}

function cookieValue(
  cookies: readonly CapturedCookie[],
  name: string,
): string | undefined {
  return cookies.find((cookie) => cookie.name === name)?.value
}

const providers: Partial<Record<MediaSourceId, CaptureProvider>> = {
  instagram: {
    name: "instagram",
    loginUrl: "https://www.instagram.com/accounts/login/",
    // `sessionid` is the actual credential; `ds_user_id` identifies the
    // account and `csrftoken` is required alongside it on later requests.
    sessionCookies: ["sessionid", "ds_user_id"],
    cookieDomains: [".instagram.com", "www.instagram.com", "instagram.com"],
    mapAccount: (cookies) => ({
      // A numeric account id, not a secret — safe in plaintext meta_data,
      // and it is the dedupe key createCredential already replaces on.
      account_id: cookieValue(cookies, "ds_user_id"),
    }),
  },
  youtube: {
    name: "youtube",
    loginUrl: "https://accounts.google.com/ServiceLogin?service=youtube",
    sessionCookies: ["SID", "__Secure-3PSID"],
    cookieDomains: [".youtube.com", ".google.com", "www.youtube.com"],
    // yt-dlp's documented export procedure. See `settleUrl` above.
    settleUrl: "https://www.youtube.com/robots.txt",
    mapAccount: () => ({
      // Google exposes no non-secret account id in the cookie jar, so the
      // account is identified by the label the user gives the credential.
      // Deliberately NOT derived from a cookie value.
    }),
  },
}

export function captureProvider(name: string): CaptureProvider | null {
  return (
    (providers as Record<string, CaptureProvider | undefined>)[name] ?? null
  )
}

/** Source ids that can be captured — drives the Vault's social cards. */
export function capturableIds(): MediaSourceId[] {
  return MEDIA_SOURCES.map((source) => source.id).filter(
    (id) => providers[id] !== undefined,
  )
}

import type { MediaSourceId } from "@/lib/media/sources"

/**
 * Social session registry (SESSION_AUTH.md §2.4).
 *
 * The exact analogue of src/server/ray-providers.ts: the import flow is
 * generic and every provider-specific concept is mapped HERE onto the
 * shared vocabulary, so no source string appears in the import route, the
 * parser, or the UI (RULES.md:57-58).
 *
 * Keyed by `MediaSourceId`, so a social credential's `provider` IS the
 * media source id and download-time lookup needs no mapping table.
 */

export interface SocialProvider {
  name: MediaSourceId
  /** Where the user signs in, linked from the import instructions. */
  loginUrl: string
  /**
   * The page the user must have open WHEN THEY EXPORT, linked from the
   * instructions.
   *
   * This is not decoration. yt-dlp's own wiki requires exporting YouTube
   * cookies from a page like robots.txt — a page that issues no new
   * session — because a normal YouTube page rotates the refresh token as
   * it loads and invalidates whatever was exported a moment earlier
   * (SESSION_AUTH.md §4.2b).
   */
  exportUrl: string
  /**
   * The session is complete once ALL of these cookies exist. Names only —
   * a cookie VALUE must never appear in code, config, logs or meta_data.
   * Shown to the user when an export is missing one.
   */
  sessionCookies: readonly string[]
  /** Only cookies on these domains are kept; everything else is dropped. */
  cookieDomains: readonly string[]
  /**
   * Provider-specific warning rendered under the instructions, or null.
   * Lives here rather than in the dialog so the UI stays generic.
   */
  caution: string | null
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

/** One parsed cookie. Shaped after CDP's `Storage.getCookies`. */
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

const providers: Partial<Record<MediaSourceId, SocialProvider>> = {
  instagram: {
    name: "instagram",
    loginUrl: "https://www.instagram.com/accounts/login/",
    exportUrl: "https://www.instagram.com/",
    // `sessionid` is the actual credential; `ds_user_id` identifies the
    // account and `csrftoken` is required alongside it on later requests.
    sessionCookies: ["sessionid", "ds_user_id"],
    cookieDomains: [".instagram.com", "www.instagram.com", "instagram.com"],
    // Measured 2026-09-02 against a real account: yt-dlp's read-write jar
    // rewrite left `sessionid` byte-identical and rotated only `rur`, so
    // ordinary use does not churn an Instagram session the way it does a
    // Google one.
    caution: null,
    mapAccount: (cookies) => ({
      // A numeric account id, not a secret — safe in plaintext meta_data,
      // and it is the dedupe key createCredential already replaces on.
      account_id: cookieValue(cookies, "ds_user_id"),
    }),
  },
  youtube: {
    name: "youtube",
    loginUrl: "https://accounts.google.com/ServiceLogin?service=youtube",
    // yt-dlp's documented export page. See `exportUrl` above.
    exportUrl: "https://www.youtube.com/robots.txt",
    sessionCookies: ["SID", "__Secure-3PSID"],
    cookieDomains: [".youtube.com", ".google.com", "www.youtube.com"],
    caution:
      "Export from a private window, then close that window immediately and do not reopen YouTube in it. Google rotates the session every time the page is loaded again, which invalidates what you just exported.",
    mapAccount: () => ({
      // Google exposes no non-secret account id in the cookie jar, so the
      // account is identified by the label the user gives the credential.
      // Deliberately NOT derived from a cookie value.
    }),
  },
}

export function socialProvider(name: string): SocialProvider | null {
  return (providers as Record<string, SocialProvider | undefined>)[name] ?? null
}

import { Hono } from "hono"

import { getRequestSession } from "@/lib/auth-request"
import { logger } from "@/lib/observability/logger"
import { cookieImportSchema } from "@/lib/schemas"
import { CookieImportError, importJar } from "@/lib/social/import"
import { socialProvider } from "@/lib/social/providers"
import { createCredential } from "@/lib/vault"

/**
 * /api/v1/social — importing a browser-exported session (SESSION_AUTH.md §2).
 *
 * This replaced /api/v1/capture and its server-side Chromium. Two reasons,
 * in order of weight: Google refuses sign-in from any CDP-attached browser,
 * so server-driven YouTube auth was never going to work at all; and the
 * capture image carried ~400MB of Chromium into every deploy.
 *
 * `:provider` is resolved through the registry exactly as
 * `/rays/oauth/:provider` resolves its own, so no source string appears in
 * this file (RULES.md:57).
 *
 * THE JAR PASSES THROUGH THIS FILE ONCE, from the request body straight
 * into the encrypted vault. It is never logged, never returned to the
 * browser, and never written to a run record.
 */

export const socialModule = new Hono()

socialModule.post("/:provider/import", async (c) => {
  const session = await getRequestSession(c.req.raw.headers)
  if (!session) return c.json({ error: "Unauthorized" }, 401)

  const provider = socialProvider(c.req.param("provider"))
  if (!provider) return c.json({ error: "Unknown provider" }, 404)

  const body = await c.req.json().catch(() => null)
  const parsed = cookieImportSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: "Paste or upload your exported cookies.txt" }, 400)
  }

  let jar: ReturnType<typeof importJar>
  try {
    jar = importJar(parsed.data.cookieJar, provider)
  } catch (error) {
    // Every CookieImportError message is written for the user and names
    // the fix, so it is passed through verbatim. It is built from registry
    // constants and counts only — it can never quote the file's contents.
    if (error instanceof CookieImportError) {
      return c.json({ error: error.message }, 422)
    }
    // Anything else means the file broke an invariant the parser assumes
    // (a tab inside a cookie value, say). Log the KIND, never the input.
    logger.warn("Cookie import failed", {
      provider: provider.name,
      reason: error instanceof Error ? error.name : "unknown",
    })
    return c.json(
      { error: "That file could not be read as a cookie jar." },
      422,
    )
  }

  /**
   * `createCredential` replaces on (user, provider, account_id), so
   * re-importing the same account updates in place rather than
   * accumulating rows — inherited behaviour, no special casing here.
   *
   * `replaces` covers the case that key cannot: a provider whose jar
   * carries no non-secret account id (YouTube) has nothing to dedupe on,
   * so a Reconnect names the row it came from. Scoped to this user and
   * provider inside `createCredential`, so an id from elsewhere matches
   * nothing rather than deleting someone else's credential.
   */
  const credential = await createCredential(
    {
      type: "cookie",
      provider: provider.name,
      // The re-serialized jar — NOT the user's original text. Whatever was
      // out of scope or expired is already gone by this point.
      accessToken: jar.contents,
      expiresAt: jar.expiresAt ?? undefined,
      metaData: {
        ...jar.account,
        // Names ONLY. meta_data is plaintext and is served to the browser
        // by GET /credentials, so a value here would leak the session.
        cookie_names: jar.cookieNames,
        captured_at: Date.now(),
        ...(parsed.data.label ? { account_name: parsed.data.label } : {}),
      },
    },
    session.user.id,
    parsed.data.replaces,
  )

  logger.info("Social session imported", {
    provider: provider.name,
    cookie_count: jar.kept,
    discarded_count: jar.discarded,
  })

  // The counts go back so the dialog can say what was thrown away. That
  // reassurance is what makes "export everything, we'll clean it" an
  // honest instruction rather than a request to trust us.
  return c.json({ credential, kept: jar.kept, discarded: jar.discarded }, 201)
})

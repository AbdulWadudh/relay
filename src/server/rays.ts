import { Hono } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"

import config from "@/config"
import { getRequestSession } from "@/lib/auth-request"
import { logger } from "@/lib/observability/logger"
import { rayCallbackSchema } from "@/lib/schemas"
import { createCredential } from "@/lib/vault"
import {
  getProvider,
  isConfigured,
  redirectUri,
  stateCookieName,
  type TokenResponse,
} from "@/server/ray-providers"

/**
 * Rays are Relay's integrations. These routes use OAuth 2.0 underneath:
 * /rays/oauth/:provider and /rays/oauth/:provider/callback for every provider.
 * CSRF protection via a short-lived, provider-scoped state cookie.
 * Exchanged tokens go encrypted into the vault; tokens are never logged.
 */

const VAULT_PATH = "/vault"

export const raysModule = new Hono()

raysModule.get("/:provider", (c) => {
  const sessionPromise = getRequestSession(c.req.raw.headers)
  return sessionPromise.then((session) => {
    if (!session) return c.redirect("/login")
    const provider = getProvider(c.req.param("provider"))
    if (!provider) return c.json({ error: "Unknown Ray provider" }, 404)
    if (!isConfigured(provider)) {
      return c.json(
        {
          error: `${provider.name} Ray is not configured (client id/secret)`,
        },
        503,
      )
    }
    const state = crypto.randomUUID()
    setCookie(c, stateCookieName(provider), state, {
      httpOnly: true,
      sameSite: "Lax",
      secure: config.app.baseUrl.startsWith("https://"),
      path: "/",
      maxAge: 600,
    })
    const url = new URL(provider.authorizeUrl)
    url.searchParams.set("client_id", provider.clientId)
    url.searchParams.set("response_type", "code")
    url.searchParams.set("redirect_uri", redirectUri(provider))
    url.searchParams.set("state", state)
    if (provider.scopes?.length) {
      url.searchParams.set("scope", provider.scopes.join(" "))
    }
    for (const [key, value] of Object.entries(provider.extraAuthParams ?? {})) {
      url.searchParams.set(key, value)
    }
    return c.redirect(url.toString())
  })
})

raysModule.get("/:provider/callback", async (c) => {
  const session = await getRequestSession(c.req.raw.headers)
  if (!session) return c.redirect("/login")
  const provider = getProvider(c.req.param("provider"))
  if (!provider) return c.json({ error: "Unknown Ray provider" }, 404)

  const parsed = rayCallbackSchema.safeParse({
    code: c.req.query("code"),
    state: c.req.query("state"),
  })
  const cookie = stateCookieName(provider)
  const cookieState = getCookie(c, cookie)
  deleteCookie(c, cookie, { path: "/" })

  if (!parsed.success || !cookieState || parsed.data.state !== cookieState) {
    logger.warn("Ray authorization rejected", {
      provider: provider.name,
      reason: "state_mismatch",
    })
    return c.redirect(`${VAULT_PATH}?error=${provider.name}_state`)
  }

  const response = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${provider.clientId}:${provider.clientSecret}`)}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: parsed.data.code,
      redirect_uri: redirectUri(provider),
    }),
  })

  if (!response.ok) {
    logger.error("Ray token exchange failed", {
      provider: provider.name,
      status: response.status,
    })
    return c.redirect(`${VAULT_PATH}?error=${provider.name}_exchange`)
  }

  const token = (await response.json()) as TokenResponse

  await createCredential(
    {
      type: "oauth",
      provider: provider.name,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: token.expires_in
        ? Date.now() + token.expires_in * 1000
        : undefined,
      metaData: provider.mapMetaData(token),
    },
    session.user.id,
  )
  logger.info("Ray workspace connected", { provider: provider.name })
  return c.redirect(`${VAULT_PATH}?connected=${provider.name}`)
})

import { Hono } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"

import config from "@/config"
import { logger } from "@/lib/observability/logger"
import { oauthCallbackSchema } from "@/lib/schemas"
import { createCredential } from "@/lib/vault"
import {
  getProvider,
  isConfigured,
  redirectUri,
  stateCookieName,
  type TokenResponse,
} from "@/server/oauth-providers"

/**
 * Generic OAuth 2.0 routes (TRD §3, PRD §4.4): /oauth/:provider and
 * /oauth/:provider/callback for every entry in the provider registry.
 * CSRF protection via a short-lived, provider-scoped state cookie.
 * Exchanged tokens go encrypted into the vault; tokens are never logged.
 */

const VAULT_PATH = "/vault"

export const oauthModule = new Hono()

oauthModule.get("/:provider", (c) => {
  const provider = getProvider(c.req.param("provider"))
  if (!provider) return c.json({ error: "Unknown OAuth provider" }, 404)
  if (!isConfigured(provider)) {
    return c.json(
      { error: `${provider.name} OAuth is not configured (client id/secret)` },
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

oauthModule.get("/:provider/callback", async (c) => {
  const provider = getProvider(c.req.param("provider"))
  if (!provider) return c.json({ error: "Unknown OAuth provider" }, 404)

  const parsed = oauthCallbackSchema.safeParse({
    code: c.req.query("code"),
    state: c.req.query("state"),
  })
  const cookie = stateCookieName(provider)
  const cookieState = getCookie(c, cookie)
  deleteCookie(c, cookie, { path: "/" })

  if (!parsed.success || !cookieState || parsed.data.state !== cookieState) {
    logger.warn("OAuth rejected", {
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
    logger.error("OAuth token exchange failed", {
      provider: provider.name,
      status: response.status,
    })
    return c.redirect(`${VAULT_PATH}?error=${provider.name}_exchange`)
  }

  const token = (await response.json()) as TokenResponse

  await createCredential({
    type: "oauth",
    provider: provider.name,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: token.expires_in
      ? Date.now() + token.expires_in * 1000
      : undefined,
    metaData: provider.mapMetaData(token),
  })
  logger.info("OAuth workspace connected", { provider: provider.name })
  return c.redirect(`${VAULT_PATH}?connected=${provider.name}`)
})

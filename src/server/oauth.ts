import { Hono } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"

import config from "@/config"
import { logger } from "@/lib/observability/logger"
import { notionCallbackSchema } from "@/lib/schemas"
import { createCredential } from "@/lib/vault"

/**
 * /api/v1/oauth/notion — Notion OAuth 2.0 flow (TRD §3, PRD §4.4).
 * CSRF protection via a short-lived state cookie. The exchanged
 * access_token goes encrypted into the vault; workspace/bot metadata
 * stays plaintext in meta_data. Tokens are never logged.
 */

const STATE_COOKIE = "notion_oauth_state"

const vaultPath = "/vault"

function notionConfigured(): boolean {
  return Boolean(config.notion.clientId && config.notion.clientSecret)
}

function redirectUri(): string {
  return `${config.app.baseUrl}${config.notion.redirectPath}`
}

export const oauthApp = new Hono()

oauthApp.get("/notion", (c) => {
  if (!notionConfigured()) {
    return c.json(
      { error: "Notion OAuth is not configured (NOTION_CLIENT_ID/SECRET)" },
      503,
    )
  }
  const state = crypto.randomUUID()
  setCookie(c, STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "Lax",
    secure: config.app.baseUrl.startsWith("https://"),
    path: "/",
    maxAge: 600,
  })
  const url = new URL(config.notion.authorizeUrl)
  url.searchParams.set("client_id", config.notion.clientId)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("owner", "user")
  url.searchParams.set("redirect_uri", redirectUri())
  url.searchParams.set("state", state)
  return c.redirect(url.toString())
})

oauthApp.get("/notion/callback", async (c) => {
  const parsed = notionCallbackSchema.safeParse({
    code: c.req.query("code"),
    state: c.req.query("state"),
  })
  const cookieState = getCookie(c, STATE_COOKIE)
  deleteCookie(c, STATE_COOKIE, { path: "/" })

  if (!parsed.success || !cookieState || parsed.data.state !== cookieState) {
    logger.warn("Notion OAuth rejected", { reason: "state_mismatch" })
    return c.redirect(`${vaultPath}?error=notion_state`)
  }

  const response = await fetch(config.notion.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(
        `${config.notion.clientId}:${config.notion.clientSecret}`,
      )}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: parsed.data.code,
      redirect_uri: redirectUri(),
    }),
  })

  if (!response.ok) {
    logger.error("Notion token exchange failed", { status: response.status })
    return c.redirect(`${vaultPath}?error=notion_exchange`)
  }

  const token = (await response.json()) as {
    access_token: string
    bot_id?: string
    workspace_id?: string
    workspace_name?: string
    workspace_icon?: string
    owner?: { type?: string }
  }

  await createCredential({
    type: "oauth",
    provider: "notion",
    accessToken: token.access_token,
    metaData: {
      bot_id: token.bot_id,
      workspace_id: token.workspace_id,
      workspace_name: token.workspace_name,
      workspace_icon: token.workspace_icon,
      owner_type: token.owner?.type,
    },
  })
  logger.info("Notion workspace connected", {
    workspace_id: token.workspace_id,
  })
  return c.redirect(`${vaultPath}?connected=notion`)
})

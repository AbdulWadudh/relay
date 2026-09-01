import { Hono } from "hono"

import config from "@/config"
import { getRequestSession } from "@/lib/auth-request"
import { captureProvider } from "@/lib/capture/providers"
import { issueTicket } from "@/lib/capture/tickets"
import { logger } from "@/lib/observability/logger"
import { captureStartSchema } from "@/lib/schemas"
import { createCredential } from "@/lib/vault"

/**
 * /api/v1/capture — the app half of session capture (SESSION_AUTH.md §2.5).
 *
 * This module holds the USER's identity; the capture service holds the
 * browsers. So the split is: authenticate here, do the work there, and
 * carry identity across on the internal channel.
 *
 * `:provider` is resolved through the capture registry exactly as
 * `/rays/oauth/:provider` resolves its own, so no source string appears in
 * this file (RULES.md:57).
 *
 * THE JAR PASSES THROUGH THIS FILE ONCE, from the capture service straight
 * into the encrypted vault. It is never logged, never returned to the
 * browser, and never written to a run record.
 */

export const captureModule = new Hono()

/** Server-to-server call, authorised by the shared secret. */
async function callCapture(
  path: string,
  init: { method: string; body?: unknown },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(`${config.capture.internalUrl}${path}`, {
    method: init.method,
    headers: {
      "content-type": "application/json",
      "x-capture-token": config.capture.internalToken,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(30_000),
  })
  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >
  return { status: response.status, body }
}

/** Starts a session and returns the one-shot ticket for its socket. */
captureModule.post("/:provider", async (c) => {
  const session = await getRequestSession(c.req.raw.headers)
  if (!session) return c.json({ error: "Unauthorized" }, 401)

  const provider = captureProvider(c.req.param("provider"))
  if (!provider) return c.json({ error: "Unknown capture provider" }, 404)

  let created: { status: number; body: Record<string, unknown> }
  try {
    created = await callCapture("/sessions", {
      method: "POST",
      body: { userId: session.user.id, provider: provider.name },
    })
  } catch (error) {
    // The capture service is a separate process; if it is unreachable that
    // is an operator problem, and the user should be told plainly rather
    // than shown a generic 500. The cause is logged because "not available"
    // on its own is undiagnosable.
    logger.error("Capture service unreachable", {
      url: config.capture.internalUrl,
      error: error instanceof Error ? error.message : String(error),
    })
    return c.json({ error: "The sign-in service is not available" }, 503)
  }

  if (created.status === 503) {
    return c.json(
      {
        error: "Another sign-in is already in progress. Try again in a minute.",
        retryAfter: created.body.retryAfter ?? 60,
      },
      503,
      { "Retry-After": String(created.body.retryAfter ?? 60) },
    )
  }
  if (created.status !== 200 || typeof created.body.sessionId !== "string") {
    return c.json({ error: "Could not start the sign-in session" }, 502)
  }

  const sessionId = created.body.sessionId

  /**
   * A browser now exists. If the ticket cannot be minted, nothing will ever
   * connect to it, so it must be torn down here rather than left for the
   * idle sweeper — otherwise one Redis blip burns a capture slot for 90
   * seconds and the next user is told the service is busy. Observed exactly
   * that during testing.
   */
  let ticket: string
  try {
    ticket = await issueTicket({ userId: session.user.id, sessionId })
  } catch (error) {
    await callCapture(`/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    }).catch(() => null)
    logger.error("Capture ticket could not be issued", {
      provider: provider.name,
      error: error instanceof Error ? error.message : String(error),
    })
    return c.json({ error: "Could not start the sign-in session" }, 503)
  }

  logger.info("Capture session requested", {
    provider: provider.name,
    session_id: sessionId,
  })

  return c.json(
    {
      sessionId,
      // Single-use and short-lived (src/lib/capture/tickets.ts). Never logged.
      ticket,
      wsUrl: `${config.capture.publicUrl}/stream`,
      expiresAt: Date.now() + config.capture.sessionTtlMs,
    },
    201,
  )
})

/**
 * Harvests the finished session into the vault.
 *
 * `createCredential` replaces on (user, provider, account_id), so
 * reconnecting the same account updates in place rather than accumulating
 * rows — inherited behaviour, no special casing here.
 */
captureModule.post("/:provider/:sessionId/finish", async (c) => {
  const session = await getRequestSession(c.req.raw.headers)
  if (!session) return c.json({ error: "Unauthorized" }, 401)

  const provider = captureProvider(c.req.param("provider"))
  if (!provider) return c.json({ error: "Unknown capture provider" }, 404)

  const body = await c.req.json().catch(() => ({}))
  const parsed = captureStartSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400)

  const harvested = await callCapture(
    `/sessions/${encodeURIComponent(c.req.param("sessionId"))}/harvest`,
    { method: "POST", body: { userId: session.user.id } },
  ).catch(() => null)

  if (!harvested)
    return c.json({ error: "The sign-in service is not available" }, 503)
  if (harvested.status === 409) {
    return c.json({ error: "Sign-in is not finished yet" }, 409)
  }
  if (harvested.status !== 200 || typeof harvested.body.jar !== "string") {
    return c.json({ error: "Could not read the signed-in session" }, 502)
  }

  const account = (harvested.body.account ?? {}) as Record<string, unknown>
  const cookieNames = (harvested.body.cookieNames ?? []) as string[]
  const expiresAt = harvested.body.expiresAt

  const credential = await createCredential(
    {
      type: "cookie",
      provider: provider.name,
      // The whole Netscape jar, encrypted by the vault like any secret.
      accessToken: harvested.body.jar,
      expiresAt: typeof expiresAt === "number" ? expiresAt : undefined,
      metaData: {
        ...account,
        // Names ONLY. meta_data is plaintext and is served to the browser
        // by GET /credentials, so a value here would leak the session.
        cookie_names: cookieNames,
        captured_at: Date.now(),
        ...(parsed.data.label ? { account_name: parsed.data.label } : {}),
      },
    },
    session.user.id,
  )

  logger.info("Social session stored", {
    provider: provider.name,
    cookie_count: cookieNames.length,
  })
  return c.json({ credential }, 201)
})

/** User cancelled, or the dialog closed. Frees the slot immediately. */
captureModule.delete("/:provider/:sessionId", async (c) => {
  const session = await getRequestSession(c.req.raw.headers)
  if (!session) return c.json({ error: "Unauthorized" }, 401)

  await callCapture(
    `/sessions/${encodeURIComponent(c.req.param("sessionId"))}`,
    { method: "DELETE" },
  ).catch(() => null)
  return c.json({ ok: true })
})

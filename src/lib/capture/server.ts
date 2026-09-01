import config from "@/config"
import { toNetscapeJar } from "@/lib/capture/cookies"
import { captureProvider } from "@/lib/capture/providers"
import {
  readCookies,
  relayInput,
  startScreencast,
  watchForCompletion,
} from "@/lib/capture/screencast"
import {
  CaptureCapacityError,
  createSession,
  dispose,
  getOwnedSession,
  sessionCount,
} from "@/lib/capture/session"
import { redeemTicket } from "@/lib/capture/tickets"
import { logger } from "@/lib/observability/logger"
import { captureInputSchema } from "@/lib/schemas"

/**
 * The capture service's HTTP + WebSocket surface (SESSION_AUTH.md §2.1).
 *
 * Its own process because Next.js route handlers cannot upgrade a request
 * to a WebSocket, and because a live browser is long-lived state that a
 * request-scoped handler cannot own.
 *
 * TWO CLASSES OF ENDPOINT, with different locks:
 *   /stream          public, authorised by a single-use ticket + Origin
 *   everything else  internal, authorised by a shared secret header
 * A reverse proxy should expose only /stream.
 */

interface SocketData {
  sessionId: string
  userId: string
}

function unauthorized(): Response {
  // Deliberately uniform: an attacker learns nothing about which check failed.
  return new Response("Unauthorized", { status: 401 })
}

/** Constant-time compare so the token cannot be recovered byte by byte. */
function tokenOk(header: string | null): boolean {
  const expected = config.capture.internalToken
  if (!expected || !header) return false
  const a = new TextEncoder().encode(header)
  const b = new TextEncoder().encode(expected)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status })
}

export function startCaptureServer() {
  const server = Bun.serve<SocketData, never>({
    port: config.capture.port,
    // Bound to every interface because the browser must reach /stream from
    // outside the container. The control endpoints are protected by the
    // shared secret above, not by the bind address.
    hostname: "0.0.0.0",

    async fetch(request, srv) {
      const url = new URL(request.url)

      if (url.pathname === "/health") {
        return json({ status: "ok", sessions: sessionCount() })
      }

      if (url.pathname === "/stream") {
        // The socket drives a real browser, so it is checked three ways:
        // the Origin must be this app, the ticket must redeem exactly once,
        // and the session it names must belong to the ticket's user.
        const origin = request.headers.get("origin")
        if (origin && origin !== config.app.baseUrl) return unauthorized()

        const claims = await redeemTicket(url.searchParams.get("ticket") ?? "")
        if (!claims) return unauthorized()

        const session = getOwnedSession(claims.sessionId, claims.userId)
        if (!session) return unauthorized()

        const upgraded = srv.upgrade(request, {
          data: { sessionId: claims.sessionId, userId: claims.userId },
        })
        return upgraded
          ? undefined
          : new Response("Upgrade failed", { status: 400 })
      }

      // --- internal control plane -------------------------------------
      if (!tokenOk(request.headers.get("x-capture-token"))) {
        return unauthorized()
      }

      if (request.method === "POST" && url.pathname === "/sessions") {
        const body = (await request.json().catch(() => null)) as {
          userId?: string
          provider?: string
        } | null
        const provider = captureProvider(body?.provider ?? "")
        if (!body?.userId || !provider)
          return json({ error: "Bad request" }, 400)

        try {
          const session = await createSession({
            userId: body.userId,
            provider,
          })
          return json({ sessionId: session.id })
        } catch (error) {
          if (error instanceof CaptureCapacityError) {
            return json(
              { error: error.message, retryAfter: error.retryAfterSeconds },
              503,
            )
          }
          logger.error("Capture session could not start", {
            provider: provider.name,
            error: error instanceof Error ? error.message : String(error),
          })
          return json({ error: "Could not start a capture session" }, 500)
        }
      }

      const harvest = url.pathname.match(/^\/sessions\/([\w-]+)\/harvest$/)
      if (request.method === "POST" && harvest) {
        const body = (await request.json().catch(() => null)) as {
          userId?: string
        } | null
        const session = getOwnedSession(harvest[1] ?? "", body?.userId ?? "")
        if (!session) return json({ error: "Not found" }, 404)
        if (session.state !== "ready") {
          return json({ error: "Sign-in is not complete yet" }, 409)
        }

        const cookies = await readCookies(session)
        const jar = toNetscapeJar(cookies, session.provider)
        const account = session.provider.mapAccount(cookies)
        // The jar leaves this process exactly once, over the internal
        // channel, straight into the encrypted vault. It is never logged.
        await dispose(session.id, "harvested")
        return json({
          jar: jar.contents,
          cookieNames: jar.cookieNames,
          expiresAt: jar.expiresAt,
          account,
        })
      }

      const cancel = url.pathname.match(/^\/sessions\/([\w-]+)$/)
      if (request.method === "DELETE" && cancel) {
        await dispose(cancel[1] ?? "", "cancelled")
        return json({ ok: true })
      }

      return new Response("Not found", { status: 404 })
    },

    websocket: {
      // Frames are small JPEGs; this bounds a hostile client's memory use.
      maxPayloadLength: 4 * 1024 * 1024,
      async open(ws) {
        const session = getOwnedSession(ws.data.sessionId, ws.data.userId)
        if (!session) {
          ws.close(4401, "Unknown session")
          return
        }
        try {
          const send = (message: unknown) => ws.send(JSON.stringify(message))
          await startScreencast(session, send)
          watchForCompletion(session, send)
        } catch (error) {
          logger.error("Capture stream failed to start", {
            session_id: session.id,
            error: error instanceof Error ? error.message : String(error),
          })
          ws.close(1011, "Could not start the stream")
          void dispose(session.id, "stream-error")
        }
      },

      async message(ws, raw) {
        const session = getOwnedSession(ws.data.sessionId, ws.data.userId)
        if (!session) {
          ws.close(4401, "Unknown session")
          return
        }
        // Every frame is untrusted: parsed, then Zod-validated, before it
        // can reach CDP. A malformed frame is dropped silently rather than
        // echoed back, which would make this a probing oracle.
        let parsed: unknown
        try {
          parsed = JSON.parse(typeof raw === "string" ? raw : raw.toString())
        } catch {
          return
        }
        const input = captureInputSchema.safeParse(parsed)
        if (!input.success) return
        await relayInput(session, input.data).catch(() => {})
      },

      close(ws) {
        // Tab closed, refreshed, or the network dropped — one of the five
        // teardown triggers, and the most common by far.
        void dispose(ws.data.sessionId, "socket-closed")
      },
    },
  })

  logger.info("Capture server listening", {
    port: server.port,
    max_concurrent: config.capture.maxConcurrent,
  })
  return server
}

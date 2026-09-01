import config from "@/config"
import { isComplete } from "@/lib/capture/cookies"
import type { CapturedCookie } from "@/lib/capture/providers"
import { type CaptureSession, dispose, touch } from "@/lib/capture/session"
import { logger } from "@/lib/observability/logger"
import type { CaptureInput } from "@/lib/schemas"

/**
 * Streams the browser to the client and relays their input back
 * (SESSION_AUTH.md §2, §5.2).
 *
 * EFFICIENCY: there is no frame rate. `Page.startScreencast` holds the next
 * frame until the last is acknowledged, so the stream self-throttles to the
 * slowest link instead of us guessing an fps and either starving a fast
 * client or flooding a slow one. A login page is near-static, so steady
 * state is close to zero bandwidth.
 *
 * SECURITY: the socket can move a real mouse and press real keys in a
 * browser that is about to hold the user's session, so navigation is fenced
 * to the provider's own domains. Without that fence an authenticated user
 * could steer a server-side browser anywhere — including the VPS's private
 * network, which is an SSRF with a keyboard attached.
 *
 * NOTHING from this file is logged: not a frame, not a keystroke, not a URL
 * beyond its hostname.
 */

export type Outbound =
  | { type: "frame"; data: string; sessionId: number }
  | { type: "ready"; account: Record<string, unknown>; cookieNames: string[] }
  | { type: "state"; state: string }
  | { type: "error"; message: string }

/** How often the jar is checked for completion. */
const COOKIE_POLL_MS = 1500

function hostAllowed(url: string, domains: readonly string[]): boolean {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    // about:blank and friends carry no host and are always fine.
    return true
  }
  return domains.some((raw) => {
    const domain = raw.toLowerCase().replace(/^\./, "")
    return host === domain || host.endsWith(`.${domain}`)
  })
}

export async function readCookies(
  session: CaptureSession,
): Promise<CapturedCookie[]> {
  // Storage.getCookies returns the whole jar including HttpOnly, which is
  // the entire reason this runs in a browser we own: `document.cookie`
  // cannot see Instagram's `sessionid`.
  const { cookies } = await session.cdp.send<{ cookies: CapturedCookie[] }>(
    "Storage.getCookies",
    {},
    session.pageSessionId,
  )
  return cookies
}

export async function startScreencast(
  session: CaptureSession,
  send: (message: Outbound) => void,
): Promise<void> {
  const { provider, cdp, pageSessionId } = session
  const { width, height } = config.capture.viewport

  await cdp.send("Page.enable", {}, pageSessionId)
  await cdp.send("Runtime.enable", {}, pageSessionId)

  const off = cdp.on((event) => {
    if (event.sessionId !== pageSessionId) return

    if (event.method === "Page.screencastFrame") {
      const data = event.params.data as string
      const frameId = event.params.sessionId as number
      send({ type: "frame", data, sessionId: frameId })
      return
    }

    // The fence. A navigation off the provider's domains ends the session
    // rather than being silently followed.
    if (event.method === "Page.frameNavigated") {
      const frame = event.params.frame as { url?: string; parentId?: string }
      if (frame.parentId || !frame.url) return // Sub-frames are not the fence.
      if (!hostAllowed(frame.url, provider.cookieDomains)) {
        let host = "unknown"
        try {
          host = new URL(frame.url).hostname
        } catch {
          // Keep the placeholder.
        }
        logger.warn("Capture navigation blocked", {
          session_id: session.id,
          provider: provider.name,
          host,
        })
        send({
          type: "error",
          message:
            "That page is outside the sign-in flow, so the session was closed.",
        })
        void dispose(session.id, "navigation-fence")
      }
    }
  })
  session.onDispose.push(off)

  await cdp.send(
    "Page.startScreencast",
    {
      format: config.capture.frame.format,
      quality: config.capture.frame.quality,
      maxWidth: width,
      maxHeight: height,
    },
    pageSessionId,
  )

  await cdp.send("Page.navigate", { url: provider.loginUrl }, pageSessionId)
  send({ type: "state", state: "pending" })
}

/**
 * Polls the jar until every required cookie exists. Cheap (one CDP call)
 * and far more reliable than trying to detect "logged in" from the DOM,
 * which differs per provider and changes without notice.
 */
export function watchForCompletion(
  session: CaptureSession,
  send: (message: Outbound) => void,
): void {
  const timer = setInterval(async () => {
    if (session.state !== "pending") return
    try {
      const cookies = await readCookies(session)
      if (!isComplete(cookies, session.provider)) return

      if (session.provider.settleUrl) {
        // See CaptureProvider.settleUrl — required for YouTube.
        await session.cdp.send(
          "Page.navigate",
          { url: session.provider.settleUrl },
          session.pageSessionId,
        )
      }
      session.state = "ready"
      send({
        type: "ready",
        account: session.provider.mapAccount(cookies),
        // Names only. A value here would reach the browser and the logs.
        cookieNames: cookies.map((cookie) => cookie.name),
      })
      logger.info("Capture session ready", {
        session_id: session.id,
        provider: session.provider.name,
        cookie_count: cookies.length,
      })
    } catch {
      // A dead socket is handled by dispose; nothing useful to do here.
    }
  }, COOKIE_POLL_MS)

  session.onDispose.push(() => clearInterval(timer))
}

/** Relays one validated client message into the browser. */
export async function relayInput(
  session: CaptureSession,
  input: CaptureInput,
): Promise<void> {
  const { cdp, pageSessionId } = session
  touch(session)

  if (input.type === "ack") {
    // Requesting the next frame IS the backpressure.
    await cdp
      .send(
        "Page.screencastFrameAck",
        { sessionId: input.sessionId },
        pageSessionId,
      )
      .catch(() => {})
    return
  }

  if (input.type === "mouse") {
    await cdp.send(
      "Input.dispatchMouseEvent",
      {
        type: input.event,
        x: input.x,
        y: input.y,
        button: input.button,
        clickCount: input.clickCount,
        deltaX: input.deltaX,
        deltaY: input.deltaY,
        modifiers: input.modifiers,
      },
      pageSessionId,
    )
    return
  }

  await cdp.send(
    "Input.dispatchKeyEvent",
    {
      type: input.event,
      key: input.key,
      code: input.code,
      text: input.text,
      windowsVirtualKeyCode: input.windowsVirtualKeyCode,
      modifiers: input.modifiers,
    },
    pageSessionId,
  )
}

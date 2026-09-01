import config from "@/config"
import { CdpClient } from "@/lib/capture/cdp"
import { type LaunchedBrowser, launchBrowser } from "@/lib/capture/chromium"
import type { CaptureProvider } from "@/lib/capture/providers"
import { logger } from "@/lib/observability/logger"

/**
 * The live capture sessions (SESSION_AUTH.md §5.1).
 *
 * An in-memory Map is authoritative ONLY because exactly one process owns
 * it — which is why capture runs as its own service rather than inside
 * Next.js, where several workers would each keep their own idea of the cap.
 *
 * Every session is ~300-500MB of headful Chromium on a one-VPS deploy, so
 * this file's real job is making sure one can never be leaked. Teardown has
 * five independent triggers; the sweep at the bottom is the one that
 * catches whatever the other four miss.
 */

export type SessionState = "pending" | "ready" | "disposed"

export interface CaptureSession {
  id: string
  userId: string
  provider: CaptureProvider
  cdp: CdpClient
  /** CDP session id for the page target, for page-scoped commands. */
  pageSessionId: string
  browser: LaunchedBrowser
  state: SessionState
  /** Set once every required cookie is present. */
  readonly createdAt: number
  lastActivityAt: number
  /** Cleared on dispose so a timer cannot fire against a dead session. */
  ttlTimer: ReturnType<typeof setTimeout>
  idleTimer: ReturnType<typeof setTimeout>
  /** Detaches the screencast listener. */
  onDispose: (() => void)[]
}

const sessions = new Map<string, CaptureSession>()

export class CaptureCapacityError extends Error {
  readonly retryAfterSeconds: number

  constructor(retryAfterSeconds: number) {
    super("All capture slots are busy")
    this.name = "CaptureCapacityError"
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export function sessionCount(): number {
  return sessions.size
}

export function getSession(id: string): CaptureSession | null {
  return sessions.get(id) ?? null
}

/**
 * A session belongs to exactly one user. Every lookup that acts on a
 * session goes through this, so a valid id from one account can never be
 * pointed at another's browser.
 */
export function getOwnedSession(
  id: string,
  userId: string,
): CaptureSession | null {
  const session = sessions.get(id)
  if (!session || session.userId !== userId) return null
  return session
}

export function touch(session: CaptureSession): void {
  session.lastActivityAt = Date.now()
  clearTimeout(session.idleTimer)
  session.idleTimer = setTimeout(
    () => void dispose(session.id, "idle"),
    config.capture.idleTimeoutMs,
  )
}

export async function createSession(options: {
  userId: string
  provider: CaptureProvider
}): Promise<CaptureSession> {
  if (sessions.size >= config.capture.maxConcurrent) {
    throw new CaptureCapacityError(
      Math.ceil(config.capture.idleTimeoutMs / 1000),
    )
  }

  const id = crypto.randomUUID()
  // Reserved BEFORE the slow launch, so two simultaneous requests cannot
  // both see a free slot and start a browser each.
  const placeholder = { id } as CaptureSession
  sessions.set(id, placeholder)

  let browser: LaunchedBrowser | null = null
  try {
    browser = await launchBrowser(id)
    const cdp = await CdpClient.connect(browser.webSocketUrl)
    const pageSessionId = await attachToPage(cdp)

    const session: CaptureSession = {
      id,
      userId: options.userId,
      provider: options.provider,
      cdp,
      pageSessionId,
      browser,
      state: "pending",
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      ttlTimer: setTimeout(
        () => void dispose(id, "ttl"),
        config.capture.sessionTtlMs,
      ),
      idleTimer: setTimeout(
        () => void dispose(id, "idle"),
        config.capture.idleTimeoutMs,
      ),
      onDispose: [],
    }
    sessions.set(id, session)
    logger.info("Capture session started", {
      session_id: id,
      provider: options.provider.name,
      live_sessions: sessions.size,
    })
    return session
  } catch (error) {
    sessions.delete(id)
    await browser?.dispose()
    throw error
  }
}

/** Attaches to the first page target and returns its flat session id. */
async function attachToPage(cdp: CdpClient): Promise<string> {
  const { targetInfos } = await cdp.send<{
    targetInfos: { targetId: string; type: string }[]
  }>("Target.getTargets")
  const page = targetInfos.find((target) => target.type === "page")
  if (!page) throw new Error("Browser exposed no page to attach to")

  const { sessionId } = await cdp.send<{ sessionId: string }>(
    "Target.attachToTarget",
    { targetId: page.targetId, flatten: true },
  )
  return sessionId
}

/**
 * Idempotent, and never throws — a failure here would otherwise strand the
 * browser it was called to kill.
 */
export async function dispose(id: string, reason: string): Promise<void> {
  const session = sessions.get(id)
  if (!session) return
  sessions.delete(id)
  if (!session.cdp) return // Placeholder from a failed launch.

  session.state = "disposed"
  clearTimeout(session.ttlTimer)
  clearTimeout(session.idleTimer)
  for (const off of session.onDispose) {
    try {
      off()
    } catch {
      // A detach failure must not stop the browser being killed.
    }
  }
  try {
    session.cdp.close()
  } catch {
    // Socket already gone.
  }
  await session.browser.dispose()
  logger.info("Capture session disposed", {
    session_id: id,
    reason,
    lived_ms: Date.now() - session.createdAt,
    live_sessions: sessions.size,
  })
}

export async function disposeAll(reason: string): Promise<void> {
  await Promise.all([...sessions.keys()].map((id) => dispose(id, reason)))
}

/**
 * The backstop. Timers can be cleared by a bug, a CDP socket can die
 * without anyone noticing, and a leaked session is half a gigabyte that
 * never comes back — so this re-checks the invariants on a fixed interval
 * regardless of what the rest of the file believes.
 */
export function startSweeper(): ReturnType<typeof setInterval> {
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [id, session] of sessions) {
      if (!session.cdp) continue
      const expired = now - session.createdAt > config.capture.sessionTtlMs
      const idle = now - session.lastActivityAt > config.capture.idleTimeoutMs
      if (expired || idle) {
        void dispose(id, expired ? "ttl-sweep" : "idle-sweep")
      }
    }
  }, 30_000)
  // Never hold the process open for the sweeper alone.
  timer.unref?.()
  return timer
}

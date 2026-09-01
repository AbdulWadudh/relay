/**
 * A minimal Chrome DevTools Protocol client.
 *
 * CDP is JSON over a WebSocket, and Bun ships a WebSocket client, so this
 * needs NO dependency — no Puppeteer, no Playwright, no CDP package
 * (RULES.md: no ghost dependencies). It implements exactly what capture
 * needs: request/response correlation, event subscription, and flat
 * session routing.
 *
 * "Flat" session mode (`Target.attachToTarget` with `flatten: true`) is
 * what lets page-scoped commands travel over the single browser socket by
 * carrying a `sessionId`, instead of opening a second connection per tab.
 */

interface PendingCall {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export interface CdpEvent {
  method: string
  params: Record<string, unknown>
  sessionId?: string
}

export class CdpError extends Error {
  readonly code: number

  constructor(method: string, code: number, message: string) {
    super(`${method} failed (${code}): ${message}`)
    this.name = "CdpError"
    this.code = code
  }
}

/** A command that never answers must not wedge a capture session. */
const CALL_TIMEOUT_MS = 30_000

export class CdpClient {
  private readonly socket: WebSocket
  private readonly pending = new Map<number, PendingCall>()
  private readonly listeners = new Set<(event: CdpEvent) => void>()
  private nextId = 1
  private closed = false

  private constructor(socket: WebSocket) {
    this.socket = socket
    socket.addEventListener("message", (event) => {
      this.receive(String(event.data))
    })
    socket.addEventListener("close", () => this.failAll("CDP socket closed"))
    socket.addEventListener("error", () => this.failAll("CDP socket error"))
  }

  static async connect(url: string): Promise<CdpClient> {
    const socket = new WebSocket(url)
    await new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        cleanup()
        resolve()
      }
      const onError = () => {
        cleanup()
        reject(new Error(`Could not connect to CDP at ${url}`))
      }
      const cleanup = () => {
        socket.removeEventListener("open", onOpen)
        socket.removeEventListener("error", onError)
      }
      socket.addEventListener("open", onOpen)
      socket.addEventListener("error", onError)
    })
    return new CdpClient(socket)
  }

  private receive(raw: string): void {
    let message: Record<string, unknown>
    try {
      message = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return
    }

    // A reply carries `id`; anything else is an event.
    if (typeof message.id === "number") {
      const call = this.pending.get(message.id)
      if (!call) return
      this.pending.delete(message.id)
      clearTimeout(call.timer)
      const error = message.error as
        | { code?: number; message?: string }
        | undefined
      if (error) {
        call.reject(
          new CdpError(
            String(message.method ?? "command"),
            error.code ?? 0,
            error.message ?? "unknown",
          ),
        )
        return
      }
      call.resolve(message.result ?? {})
      return
    }

    if (typeof message.method !== "string") return
    const event: CdpEvent = {
      method: message.method,
      params: (message.params ?? {}) as Record<string, unknown>,
      sessionId:
        typeof message.sessionId === "string" ? message.sessionId : undefined,
    }
    for (const listener of this.listeners) listener(event)
  }

  private failAll(reason: string): void {
    this.closed = true
    for (const [, call] of this.pending) {
      clearTimeout(call.timer)
      call.reject(new Error(reason))
    }
    this.pending.clear()
  }

  send<T = Record<string, unknown>>(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string,
  ): Promise<T> {
    if (this.closed) return Promise.reject(new Error("CDP socket is closed"))
    const id = this.nextId++
    const payload = JSON.stringify(
      sessionId ? { id, method, params, sessionId } : { id, method, params },
    )

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`${method} timed out after ${CALL_TIMEOUT_MS}ms`))
      }, CALL_TIMEOUT_MS)
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      })
      this.socket.send(payload)
    })
  }

  /** Returns an unsubscribe function. */
  on(listener: (event: CdpEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  close(): void {
    this.closed = true
    this.failAll("CDP client closed")
    this.listeners.clear()
    try {
      this.socket.close()
    } catch {
      // Already closing — nothing to salvage.
    }
  }
}

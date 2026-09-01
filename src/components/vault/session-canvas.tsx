"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The live browser, drawn into a canvas (SESSION_AUTH.md §2).
 *
 * The user is looking at a real Chromium running on the server and typing
 * into the provider's own login page — which is why Relay never sees a
 * social password, and why 2FA and CAPTCHA simply work.
 *
 * Frames are acknowledged AFTER they are painted, not on arrival: the ack
 * is the server's backpressure signal, so acking early would ask for
 * frames this client cannot keep up with.
 */

/** CDP modifier bits: Alt=1, Ctrl=2, Meta=4, Shift=8. */
function modifiersOf(event: React.KeyboardEvent | React.PointerEvent): number {
  return (
    (event.altKey ? 1 : 0) |
    (event.ctrlKey ? 2 : 0) |
    (event.metaKey ? 4 : 0) |
    (event.shiftKey ? 8 : 0)
  )
}

const BUTTONS = ["left", "middle", "right"] as const

export interface SessionCanvasProps {
  wsUrl: string
  ticket: string
  width: number
  height: number
  onReady: (account: Record<string, unknown>) => void
  onClosed: (reason: string) => void
}

export function SessionCanvas({
  wsUrl,
  ticket,
  width,
  height,
  onReady,
  onClosed,
}: SessionCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const socketRef = React.useRef<WebSocket | null>(null)
  const [connected, setConnected] = React.useState(false)

  // Kept in refs so the socket effect never re-runs when a callback
  // identity changes — reconnecting would drop the user's half-typed login.
  const onReadyRef = React.useRef(onReady)
  const onClosedRef = React.useRef(onClosed)
  onReadyRef.current = onReady
  onClosedRef.current = onClosed

  React.useEffect(() => {
    const socket = new WebSocket(
      `${wsUrl}?ticket=${encodeURIComponent(ticket)}`,
    )
    socketRef.current = socket
    let disposed = false

    socket.onopen = () => setConnected(true)

    socket.onmessage = async (event) => {
      let message: Record<string, unknown>
      try {
        message = JSON.parse(String(event.data)) as Record<string, unknown>
      } catch {
        return
      }

      if (message.type === "frame") {
        const canvas = canvasRef.current
        const context = canvas?.getContext("2d")
        if (!canvas || !context) return
        try {
          // createImageBitmap decodes off the main thread; an <img> with a
          // data: URL would decode synchronously and stutter the page.
          const blob = await fetch(
            `data:image/jpeg;base64,${message.data as string}`,
          ).then((response) => response.blob())
          const bitmap = await createImageBitmap(blob)
          context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
          bitmap.close()
        } catch {
          // A dropped frame is not worth interrupting the session for.
        }
        // Painted — now ask for the next one.
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({ type: "ack", sessionId: message.sessionId }),
          )
        }
        return
      }

      if (message.type === "ready") {
        onReadyRef.current((message.account ?? {}) as Record<string, unknown>)
        return
      }
      if (message.type === "error") {
        onClosedRef.current(String(message.message ?? "The session ended."))
      }
    }

    socket.onclose = () => {
      setConnected(false)
      if (!disposed) onClosedRef.current("The sign-in window closed.")
    }

    return () => {
      disposed = true
      socket.close()
      socketRef.current = null
    }
  }, [wsUrl, ticket])

  const send = (payload: Record<string, unknown>) => {
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload))
    }
  }

  /**
   * The canvas is displayed at whatever width fits, so pointer coordinates
   * must be mapped back into the browser's own pixel space or every click
   * lands in the wrong place on a narrow screen.
   */
  const toBrowserSpace = (event: React.PointerEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height,
    }
  }

  const mouse = (event: React.PointerEvent, type: string) => {
    const { x, y } = toBrowserSpace(event)
    send({
      type: "mouse",
      event: type,
      x,
      y,
      button: BUTTONS[event.button] ?? "left",
      clickCount: type === "mouseMoved" ? 0 : 1,
      modifiers: modifiersOf(event),
    })
  }

  const key = (event: React.KeyboardEvent, type: "keyDown" | "keyUp") => {
    // Everything is forwarded, including Tab and Enter, so the login form
    // behaves exactly as it would locally.
    event.preventDefault()
    send({
      type: "key",
      event: type,
      key: event.key,
      code: event.code,
      windowsVirtualKeyCode: event.keyCode,
      modifiers: modifiersOf(event),
    })
    // A printable character needs a separate char event or the field stays
    // empty — keyDown alone does not insert text.
    if (type === "keyDown" && event.key.length === 1) {
      send({ type: "key", event: "char", text: event.key })
    }
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-border bg-black">
      {/* The canvas IS the interactive surface: it must be focusable to
          receive the keystrokes that are relayed into the browser. */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        tabIndex={0}
        aria-label="Sign-in window"
        className={cn(
          "block w-full cursor-default outline-none",
          !connected && "opacity-40",
        )}
        onPointerDown={(e) => {
          e.currentTarget.focus()
          mouse(e, "mousePressed")
        }}
        onPointerUp={(e) => mouse(e, "mouseReleased")}
        onPointerMove={(e) => mouse(e, "mouseMoved")}
        onKeyDown={(e) => key(e, "keyDown")}
        onKeyUp={(e) => key(e, "keyUp")}
        onContextMenu={(e) => e.preventDefault()}
      />
      {!connected ? (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-white">
          Opening a browser…
        </p>
      ) : null}
    </div>
  )
}

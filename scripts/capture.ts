/**
 * Capture service entrypoint — `bun run capture`.
 *
 * A third process alongside the web app and the worker (SESSION_AUTH.md
 * §2.1). It exists separately for two reasons that are not stylistic:
 * Next.js route handlers cannot upgrade a request to a WebSocket, and the
 * concurrency cap is only enforceable if exactly one process owns the map
 * of live browsers.
 */

import { startCaptureServer } from "@/lib/capture/server"
import { disposeAll, startSweeper } from "@/lib/capture/session"
import { logger } from "@/lib/observability/logger"

const server = startCaptureServer()
const sweeper = startSweeper()

/**
 * Every live session is a browser process and a profile directory holding
 * real session cookies. Neither may survive this process, so shutdown
 * disposes them all before exiting rather than leaving them to the OS.
 */
let closing = false
const shutdown = async (signal: string) => {
  if (closing) return
  closing = true
  logger.info("Capture service shutting down", { signal })
  clearInterval(sweeper)
  server.stop(true)
  await disposeAll("shutdown")
  process.exit(0)
}

process.on("SIGTERM", () => void shutdown("SIGTERM"))
process.on("SIGINT", () => void shutdown("SIGINT"))

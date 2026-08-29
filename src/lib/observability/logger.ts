import type { MiddlewareHandler } from "hono"

/**
 * OpenObserve server-side logging pipeline (DESIGN §3, TRD §1).
 *
 * Events are buffered and flushed in batches to the OpenObserve JSON ingest
 * API (`/api/{org}/{stream}/_json`). When OPENOBSERVE_URL is not configured
 * the logger degrades to structured console output so local development
 * works with zero external dependencies.
 */

export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogEventInput {
  level: LogLevel
  message: string
  service: string
  [key: string]: unknown
}

export interface LogEvent extends LogEventInput {
  _timestamp: number
}

const FLUSH_INTERVAL_MS = 2000
const MAX_BUFFER = 50

interface OpenObserveConfig {
  url: string
  org: string
  auth: string
}

function getConfig(): OpenObserveConfig | null {
  const url = process.env.OPENOBSERVE_URL
  const user = process.env.OPENOBSERVE_USER
  const token = process.env.OPENOBSERVE_TOKEN
  if (!url || !user || !token) return null
  return {
    url: url.replace(/\/$/, ""),
    org: process.env.OPENOBSERVE_ORG ?? "default",
    auth: btoa(`${user}:${token}`),
  }
}

const buffers = new Map<string, LogEvent[]>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

async function flushStream(stream: string, events: LogEvent[]) {
  const config = getConfig()
  if (!config) return
  try {
    await fetch(`${config.url}/api/${config.org}/${stream}/_json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${config.auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(events),
    })
  } catch (error) {
    console.error("[observability] OpenObserve ingest failed:", error)
  }
}

export async function flushAll() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  const pending = [...buffers.entries()].filter(([, e]) => e.length > 0)
  buffers.clear()
  await Promise.all(
    pending.map(([stream, events]) => flushStream(stream, events)),
  )
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushAll()
  }, FLUSH_INTERVAL_MS)
}

export function ingest(stream: string, event: LogEventInput) {
  const entry: LogEvent = { ...event, _timestamp: Date.now() }
  if (!getConfig()) {
    const line = `[${entry.level}] ${entry.service}: ${entry.message}`
    if (entry.level === "error") console.error(line, entry)
    else if (entry.level === "warn") console.warn(line, entry)
    else console.log(line)
    return
  }
  const buffer = buffers.get(stream) ?? []
  buffer.push(entry)
  buffers.set(stream, buffer)
  if (buffer.length >= MAX_BUFFER) {
    const events = buffer.splice(0, buffer.length)
    void flushStream(stream, events)
  } else {
    scheduleFlush()
  }
}

export const logger = {
  debug: (message: string, fields: Record<string, unknown> = {}) =>
    ingest("relay_server", {
      level: "debug",
      message,
      service: "relay-api",
      ...fields,
    }),
  info: (message: string, fields: Record<string, unknown> = {}) =>
    ingest("relay_server", {
      level: "info",
      message,
      service: "relay-api",
      ...fields,
    }),
  warn: (message: string, fields: Record<string, unknown> = {}) =>
    ingest("relay_server", {
      level: "warn",
      message,
      service: "relay-api",
      ...fields,
    }),
  error: (message: string, fields: Record<string, unknown> = {}) =>
    ingest("relay_server", {
      level: "error",
      message,
      service: "relay-api",
      ...fields,
    }),
}

/**
 * Hono middleware: logs every /api/v1 request (method, path, status,
 * duration) and routes uncaught handler errors to OpenObserve. Tokens and
 * request bodies are intentionally never logged (PRD §6).
 */
export function openObserveMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const start = performance.now()
    try {
      await next()
    } catch (error) {
      logger.error("Unhandled API error", {
        method: c.req.method,
        path: c.req.path,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
    const duration_ms = Math.round(performance.now() - start)
    const status = c.res.status
    logger[status >= 500 ? "error" : status >= 400 ? "warn" : "info"](
      "HTTP request",
      { method: c.req.method, path: c.req.path, status, duration_ms },
    )
  }
}

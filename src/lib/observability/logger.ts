import { Writable } from "node:stream"
import type { MiddlewareHandler } from "hono"
import pino, { type Logger } from "pino"

import config from "@/config"

export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogEventInput {
  level: LogLevel
  message: string
  service: string
  [key: string]: unknown
}

interface OpenObserveConfig {
  url: string
  org: string
  stream: string
  authorization: string
}

function getOpenObserveConfig(): OpenObserveConfig | null {
  const { url, token, org, streams } = config.observability
  if (!url || !token) return null
  return {
    url: url.replace(/\/$/, ""),
    org,
    stream: streams.server,
    authorization: token,
  }
}

const openObserveConfig = getOpenObserveConfig()

class OpenObserveStream extends Writable {
  private readonly pending: Record<string, unknown>[] = []
  private timer: ReturnType<typeof setTimeout> | null = null

  override _write(
    chunk: Buffer,
    _encoding: string,
    callback: (error?: Error) => void,
  ) {
    try {
      this.pending.push(JSON.parse(chunk.toString()) as Record<string, unknown>)
      if (this.pending.length >= 50) void this.flush()
      else this.schedule()
      callback()
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)))
    }
  }

  private schedule() {
    if (this.timer) return
    this.timer = setTimeout(() => {
      this.timer = null
      void this.flush()
    }, 2000)
  }

  private async flush() {
    const target = openObserveConfig
    if (!target || this.pending.length === 0) return
    const events = this.pending.splice(0, this.pending.length)
    try {
      await fetch(`${target.url}/api/${target.org}/${target.stream}/_json`, {
        method: "POST",
        headers: {
          Authorization: target.authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(events),
      })
    } catch (error) {
      console.error("[observability] OpenObserve ingest failed:", error)
    }
  }

  async shutdown() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    await this.flush()
  }
}

const openObserveStream = openObserveConfig ? new OpenObserveStream() : null
const pinoLogger: Logger = pino(
  { level: "debug", base: { service: "relay-api" } },
  openObserveStream
    ? pino.multistream([
        { stream: process.stdout },
        { stream: openObserveStream },
      ])
    : process.stdout,
)

export function ingest(stream: string, event: LogEventInput) {
  const child = pinoLogger.child({ stream })
  child[event.level]({ ...event, _timestamp: Date.now() }, event.message)
}

export async function flushAll() {
  await openObserveStream?.shutdown()
}

function log(level: LogLevel) {
  return (message: string, fields: Record<string, unknown> = {}) =>
    pinoLogger[level](fields, message)
}

export const logger = {
  debug: log("debug"),
  info: log("info"),
  warn: log("warn"),
  error: log("error"),
}

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

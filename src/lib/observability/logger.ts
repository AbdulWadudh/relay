import { Writable } from "node:stream"
import type { MiddlewareHandler } from "hono"
import type pinoDefault from "pino"
import type { DestinationStream, Logger } from "pino"

import config from "@/config"

// require (not a static import) with turbopackIgnore so Turbopack leaves this
// call untouched instead of routing it through its dev-mode external-module
// wrapper, which has a known bug resolving pino's worker-thread transport
// ("Failed to load external module pino-<hash>"). Production builds/next
// start were never affected — this only works around next dev.
const pino = require(/* turbopackIgnore: true */ "pino") as typeof pinoDefault

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

/**
 * Appends to a local file so the web app, the worker and the capture
 * service can be read together instead of across three terminals.
 *
 * `append: true` matters — the three processes start at different times and
 * a truncating open would erase whichever started first. `mkdir: true`
 * saves a first-run failure on a clean checkout. A failure to open the file
 * must never take the process down, so it degrades to stdout only.
 */
function fileStream(): DestinationStream | null {
  const dest = config.observability.logFile
  if (!dest) return null
  try {
    return pino.destination({ dest, append: true, mkdir: true, sync: false })
  } catch (error) {
    console.error("[observability] could not open log file:", error)
    return null
  }
}

// Opened ONCE — calling fileStream() per array slot would open two
// independent handles onto the same file and interleave their writes.
const logFileStream = fileStream()

const streams = [
  { stream: process.stdout },
  ...(logFileStream ? [{ stream: logFileStream }] : []),
  ...(openObserveStream ? [{ stream: openObserveStream }] : []),
]

const pinoLogger: Logger = pino(
  { level: "debug", base: { service: config.observability.service } },
  streams.length > 1 ? pino.multistream(streams) : process.stdout,
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

/**
 * Field names whose values must never reach a log sink (RULES.md, PRD §6:
 * zero plaintext token exposure).
 *
 * Matched per WORD, not per raw substring, so "monkey" is not treated as a
 * key and "encoded" is not treated as a code. `isSensitiveKey` splits
 * camelCase before comparing — the previous regex only handled
 * `_`-delimited segments, which meant `accessToken` (the exact field name
 * `credentialInputSchema` uses) sailed through unredacted and every
 * POST /credentials wrote the user's raw API key to OpenObserve.
 */
const SENSITIVE_WORDS = new Set([
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "code",
  "key",
  "apikey",
  "credential",
  "credentials",
])

export function isSensitiveKey(key: string): boolean {
  return (
    key
      // camelCase / PascalCase -> word boundaries
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .some((word) => SENSITIVE_WORDS.has(word))
  )
}
const MAX_TRACE_BODY_LENGTH = 8_192

export function redactLogValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactLogValue)
  if (!value || typeof value !== "object") return value
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? "[REDACTED]" : redactLogValue(item),
    ]),
  )
}

async function traceBody(
  body: ReadableStream<Uint8Array> | null,
  contentType: string | undefined,
): Promise<unknown> {
  if (!body || !contentType?.match(/json|text|form-urlencoded/i))
    return undefined
  try {
    const text = await new Response(body).text()
    // REDACT FIRST, TRUNCATE SECOND — never the other way round.
    //
    // This used to slice the RAW text whenever it exceeded the cap and
    // return it unredacted, so the size guard doubled as a redaction
    // bypass: any request big enough to trip it was logged verbatim. That
    // is precisely the shape of a cookie-jar import (POST /social/:p/import
    // is tens of KB), which would have written the user's whole social
    // session to OpenObserve. Truncation is a log-volume control and must
    // never be able to widen what is exposed.
    const redacted = contentType.includes("json")
      ? redactLogValue(JSON.parse(text))
      : redactLogValue(Object.fromEntries(new URLSearchParams(text)))
    const rendered = JSON.stringify(redacted) ?? ""
    if (rendered.length > MAX_TRACE_BODY_LENGTH) {
      return `${rendered.slice(0, MAX_TRACE_BODY_LENGTH)}…[truncated]`
    }
    return redacted
  } catch {
    return "[unavailable]"
  }
}

export function openObserveMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const start = performance.now()
    const requestBody = await traceBody(
      c.req.raw.clone().body,
      c.req.header("content-type"),
    )
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
    const responseBody = await traceBody(
      c.res.clone().body,
      c.res.headers.get("content-type") ?? undefined,
    )
    logger[status >= 500 ? "error" : status >= 400 ? "warn" : "info"](
      "HTTP request",
      {
        method: c.req.method,
        path: c.req.path,
        query: redactLogValue(
          Object.fromEntries(new URL(c.req.url).searchParams),
        ),
        status,
        duration_ms,
        request_body: requestBody,
        response_body: responseBody,
        response_content_type: c.res.headers.get("content-type"),
      },
    )
  }
}

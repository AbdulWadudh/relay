import type { MiddlewareHandler } from "hono"

import { logger } from "@/lib/observability/logger"
import { redactLogValue } from "@/lib/observability/redact"
import { skipBodyTrace } from "@/lib/observability/skip-paths"

/**
 * The Hono middleware that records one line per API request.
 *
 * Split out of `src/lib/observability/logger.ts`, which owns the logger and
 * its sinks. This owns the HTTP TRACE: what a request line contains, how
 * much of a body is kept, and which bodies are not worth keeping. The two
 * move at different rates, and logger.ts had crossed the 250-line cap.
 */

const MAX_TRACE_BODY_LENGTH = 8_192

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
    // The BODY is skipped separately from the whole line: `GET
    // /runs/:id/logs` answers with the run's log lines, the UI polls it
    // every 2s while a run is live, and tracing that response re-ingested
    // up to 8KB of the log store back into the log store on every poll.
    // Its status and duration are still worth recording.
    const traced = !skipBodyTrace(c.req.path)
    const requestBody = traced
      ? await traceBody(c.req.raw.clone().body, c.req.header("content-type"))
      : "[skipped]"
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
    const responseBody = traced
      ? await traceBody(
          c.res.clone().body,
          c.res.headers.get("content-type") ?? undefined,
        )
      : "[skipped]"
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

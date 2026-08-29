import type { NextFetchEvent, NextRequest } from "next/server"
import { NextResponse } from "next/server"

const SENSITIVE_FIELD =
  /(^|_)(password|secret|token|authorization|cookie|code|key)(_|$)/i

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (!value || typeof value !== "object") return value
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_FIELD.test(key) ? "[REDACTED]" : redact(item),
    ]),
  )
}

function sendTrace(event: Record<string, unknown>) {
  const url = process.env.OPENOBSERVE_URL?.replace(/\/$/, "")
  const token = process.env.OPENOBSERVE_TOKEN
  const org = process.env.OPENOBSERVE_ORG ?? "default"
  if (!url || !token) {
    console.log(JSON.stringify(event))
    return
  }
  return fetch(`${url}/api/${org}/relay_server/_json`, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([event]),
  }).catch((error) => {
    console.error(
      "[observability] OpenObserve proxy ingest failed:",
      error instanceof Error ? error.message : String(error),
    )
  })
}

/**
 * Global request boundary for Next.js. API responses are measured again by
 * the Hono middleware, which is the layer that can observe their final status
 * and response body. Next Proxy runs before page rendering, so for pages it
 * records the request handoff rather than inventing a response status.
 */
export function proxy(request: NextRequest, event: NextFetchEvent) {
  const requestId = crypto.randomUUID()
  const startedAt = performance.now()

  event.waitUntil(
    Promise.resolve(sendTrace({
        level: "info",
        message: "HTTP request received",
        service: "relay-api",
        request_id: requestId,
        method: request.method,
        path: request.nextUrl.pathname,
        query: redact(
          Object.fromEntries(request.nextUrl.searchParams),
        ),
        user_agent: request.headers.get("user-agent") ?? undefined,
        content_type: request.headers.get("content-type") ?? undefined,
        started_at: Date.now(),
        proxy_duration_ms: Math.round(performance.now() - startedAt),
      })),
  )

  const response = NextResponse.next()
  response.headers.set("x-relay-request-id", requestId)
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

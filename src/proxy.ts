import type { NextFetchEvent, NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { logger, redactLogValue } from "@/lib/observability/logger"

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
    Promise.resolve().then(() => {
      logger.info("HTTP request received", {
        request_id: requestId,
        method: request.method,
        path: request.nextUrl.pathname,
        query: redactLogValue(
          Object.fromEntries(request.nextUrl.searchParams),
        ),
        user_agent: request.headers.get("user-agent") ?? undefined,
        content_type: request.headers.get("content-type") ?? undefined,
        started_at: Date.now(),
        proxy_duration_ms: Math.round(performance.now() - startedAt),
      })
    }),
  )

  const response = NextResponse.next()
  response.headers.set("x-relay-request-id", requestId)
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

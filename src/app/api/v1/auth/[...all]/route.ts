import { toNextJsHandler } from "better-auth/next-js"

import { auth } from "@/lib/auth"
import { logger, redactLogValue } from "@/lib/observability/logger"

const authHandlers = toNextJsHandler(auth)

async function handleAuthRequest(
  handler: (request: Request) => Response | Promise<Response>,
  request: Request,
) {
  try {
    const response = await handler(request)
    if (response.status >= 400) {
      const body = await response.clone().text().catch(() => "")
      logger.error("Better Auth returned an error", {
        method: request.method,
        path: new URL(request.url).pathname,
        status: response.status,
        response_body: redactLogValue(body),
      })
    }
    return response
  } catch (error) {
    logger.error("Better Auth request failed", {
      method: request.method,
      path: new URL(request.url).pathname,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return Response.json({ error: "Authentication request failed" }, { status: 500 })
  }
}

export function GET(request: Request) {
  return handleAuthRequest(authHandlers.GET, request)
}

export function POST(request: Request) {
  return handleAuthRequest(authHandlers.POST, request)
}

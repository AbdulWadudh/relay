import type { Context, MiddlewareHandler } from "hono"

import type { AuthSession } from "@/lib/auth"
import { getRequestSession } from "@/lib/auth-request"

/**
 * Session guard for the Hono modules, applied as `module.use("*", ...)`.
 *
 * Per-module rather than once in route.ts on purpose: a module that mounts
 * its own guard is fail-CLOSED, so a route added to it later is protected
 * by default. Matching paths centrally is fail-open — mount a new module,
 * forget the `use()`, and it ships unauthenticated.
 */

export type SessionEnv = { Variables: { session: AuthSession } }

function guard(
  onMissing: (c: Context<SessionEnv>) => Response,
): MiddlewareHandler<SessionEnv> {
  return async (c, next) => {
    const session = await getRequestSession(c.req.raw.headers)
    if (!session) return onMissing(c)
    c.set("session", session)
    await next()
  }
}

/** For JSON APIs: the browser's fetch gets a 401 it can branch on. */
export const requireSession = guard((c) =>
  c.json({ error: "Unauthorized" }, 401),
)

/**
 * For routes the browser NAVIGATES to — the Ray OAuth start and callback.
 * A 401 body would render as raw JSON in the address bar instead of
 * sending the user somewhere useful.
 */
export const requireSessionOrRedirect = guard((c) => c.redirect("/login"))

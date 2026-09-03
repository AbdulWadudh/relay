import { Hono } from "hono"

import { getAnalytics } from "@/lib/analytics"
import { analyticsQuerySchema } from "@/lib/schemas"
import { requireSession, type SessionEnv } from "@/server/require-session"

/**
 * /api/v1/analytics — the dashboard's read model.
 *
 * ONE endpoint returning ONE payload for the whole page. Splitting it per
 * panel would let two cards on the same screen show numbers from
 * different windows while their requests landed out of order, and the
 * expensive part of the work is a single scan the panels share anyway
 * (src/lib/analytics/facts.ts).
 *
 * Everything is scoped to the session's user inside `getAnalytics`; there
 * is no id in the path to tamper with.
 */

export const analyticsModule = new Hono<SessionEnv>()
analyticsModule.use("*", requireSession)

analyticsModule.get("/summary", async (c) => {
  const session = c.get("session")
  const { range } = analyticsQuerySchema.parse({ range: c.req.query("range") })
  return c.json(await getAnalytics(session.user.id, range))
})

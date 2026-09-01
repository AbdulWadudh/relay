import { Hono } from "hono"

import { getRequestSession } from "@/lib/auth-request"
import { logger } from "@/lib/observability/logger"
import { extractionOrderSchema } from "@/lib/schemas"
import { getExtractionOrder, SETTING_KEYS, writeSetting } from "@/lib/settings"

/**
 * /api/v1/settings — per-user preferences.
 *
 * Nothing here is secret (see src/lib/settings.ts), so responses are the
 * stored value verbatim. Every write is Zod-validated against the provider
 * catalog before it reaches the database.
 */

export const settingsModule = new Hono()

settingsModule.get("/extraction-order", async (c) => {
  const session = await getRequestSession(c.req.raw.headers)
  if (!session) return c.json({ error: "Unauthorized" }, 401)
  return c.json({ order: await getExtractionOrder(session.user.id) })
})

settingsModule.put("/extraction-order", async (c) => {
  const session = await getRequestSession(c.req.raw.headers)
  if (!session) return c.json({ error: "Unauthorized" }, 401)

  const body = await c.req.json().catch(() => null)
  const parsed = extractionOrderSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: "Invalid provider order", issues: parsed.error.issues },
      400,
    )
  }

  await writeSetting(
    session.user.id,
    SETTING_KEYS.extractionOrder,
    parsed.data.order,
  )
  logger.info("Extraction order updated", { count: parsed.data.order.length })

  // Read back through the reconciler rather than echoing the request, so
  // the client renders exactly what the pipeline will use.
  return c.json({ order: await getExtractionOrder(session.user.id) })
})

import { Hono } from "hono"

import { logger } from "@/lib/observability/logger"
import { extractionOrderSchema, shareAutoRunSchema } from "@/lib/schemas"
import {
  getExtractionOrder,
  getShareAutoRun,
  SETTING_KEYS,
  writeSetting,
} from "@/lib/settings"
import { requireSession, type SessionEnv } from "@/server/require-session"

/**
 * /api/v1/settings — per-user preferences.
 *
 * Nothing here is secret (see src/lib/settings.ts), so responses are the
 * stored value verbatim. Every write is Zod-validated against the provider
 * catalog before it reaches the database.
 */

export const settingsModule = new Hono<SessionEnv>()
settingsModule.use("*", requireSession)

settingsModule.get("/extraction-order", async (c) => {
  const session = c.get("session")
  return c.json({ order: await getExtractionOrder(session.user.id) })
})

settingsModule.put("/extraction-order", async (c) => {
  const session = c.get("session")

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

settingsModule.get("/share-auto-run", async (c) => {
  const session = c.get("session")
  return c.json({ enabled: await getShareAutoRun(session.user.id) })
})

settingsModule.put("/share-auto-run", async (c) => {
  const session = c.get("session")

  const body = await c.req.json().catch(() => null)
  const parsed = shareAutoRunSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: "Invalid value", issues: parsed.error.issues }, 400)
  }

  await writeSetting(
    session.user.id,
    SETTING_KEYS.shareAutoRun,
    parsed.data.enabled,
  )
  logger.info("Share auto-run updated", { enabled: parsed.data.enabled })
  return c.json({ enabled: parsed.data.enabled })
})

import { Hono } from "hono"
import { resolveChain } from "@/lib/extraction/chain"
import { logger } from "@/lib/observability/logger"
import { extractionChainSchema, shareAutoRunSchema } from "@/lib/schemas"
import {
  getShareAutoRun,
  SETTING_KEYS,
  setCredentialChain,
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

settingsModule.get("/extraction-chain", async (c) => {
  const session = c.get("session")
  return c.json({ chain: await resolveChain(session.user.id) })
})

settingsModule.put("/extraction-chain", async (c) => {
  const session = c.get("session")

  const body = await c.req.json().catch(() => null)
  const parsed = extractionChainSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: "Invalid extraction chain", issues: parsed.error.issues },
      400,
    )
  }

  await setCredentialChain(session.user.id, parsed.data.chain)
  logger.info("Extraction chain updated", { count: parsed.data.chain.length })

  // Read back through the reconciler rather than echoing the request, so
  // the client renders exactly what the pipeline will use.
  return c.json({ chain: await resolveChain(session.user.id) })
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

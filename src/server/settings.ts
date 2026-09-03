import { Hono } from "hono"
import { resolveChain } from "@/lib/extraction/chain"
import { stageModels } from "@/lib/extraction/model-choice"
import { CHAT_STAGE_IDS } from "@/lib/extraction/stages"
import { logger } from "@/lib/observability/logger"
import {
  extractionChainSchema,
  shareAutoRunSchema,
  stageModelSchema,
} from "@/lib/schemas"
import {
  getShareAutoRun,
  SETTING_KEYS,
  setCredentialChain,
  setStageModel,
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

/**
 * Every stage's chain in ONE response. The Settings card is tabbed, so
 * fetching per tab would mean four round trips to render one card and a
 * loading flash on each switch.
 */
settingsModule.get("/chains", async (c) => {
  const session = c.get("session")
  const entries = await Promise.all(
    CHAT_STAGE_IDS.map(
      async (stage) =>
        [stage, await resolveChain(session.user.id, stage)] as const,
    ),
  )
  return c.json({ chains: Object.fromEntries(entries) })
})

settingsModule.put("/chains", async (c) => {
  const session = c.get("session")

  const body = await c.req.json().catch(() => null)
  const parsed = extractionChainSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: "Invalid stage chain", issues: parsed.error.issues },
      400,
    )
  }

  const { stage, chain } = parsed.data
  await setCredentialChain(session.user.id, stage, chain)
  logger.info("Stage chain updated", { stage, count: chain.length })

  // Read back through the reconciler rather than echoing the request, so
  // the client renders exactly what the pipeline will use.
  return c.json({ chain: await resolveChain(session.user.id, stage) })
})

/**
 * Which model each account in a stage would use, and what else it could.
 * Per stage rather than all four at once: this reads a catalog per account,
 * and only the open tab's is worth paying for.
 */
settingsModule.get("/models/:stage", async (c) => {
  const session = c.get("session")
  const parsed = stageModelSchema
    .pick({ stage: true })
    .safeParse({ stage: c.req.param("stage") })
  if (!parsed.success) return c.json({ error: "Unknown stage" }, 400)

  return c.json({
    accounts: await stageModels(session.user.id, parsed.data.stage),
  })
})

settingsModule.put("/models", async (c) => {
  const session = c.get("session")

  const body = await c.req.json().catch(() => null)
  const parsed = stageModelSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: "Invalid model choice", issues: parsed.error.issues },
      400,
    )
  }

  const { stage, entryId, model } = parsed.data
  await setStageModel(session.user.id, stage, entryId, model)
  logger.info("Stage model pinned", { stage, pinned: model !== null })

  return c.json({ accounts: await stageModels(session.user.id, stage) })
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

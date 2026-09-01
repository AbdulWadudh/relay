import { Hono } from "hono"

import { getRequestSession } from "@/lib/auth-request"
import {
  listPrompts,
  type PromptKey,
  seedPrompts,
  updatePrompt,
} from "@/lib/extraction/prompts"
import { logger } from "@/lib/observability/logger"
import { promptUpdateSchema } from "@/lib/schemas"

/**
 * /api/v1/prompts — the pipeline's own prompts (Task 4.4).
 *
 * Read-and-edit only: the set of prompts is fixed by what the pipeline
 * calls, so there is no create or delete. Seeding on GET means a user who
 * has never run the pipeline still sees them.
 */

export const promptsModule = new Hono()

promptsModule.get("/", async (c) => {
  const session = await getRequestSession(c.req.raw.headers)
  if (!session) return c.json({ error: "Unauthorized" }, 401)
  await seedPrompts(session.user.id)
  return c.json({ prompts: await listPrompts(session.user.id) })
})

promptsModule.put("/:key", async (c) => {
  const session = await getRequestSession(c.req.raw.headers)
  if (!session) return c.json({ error: "Unauthorized" }, 401)

  const body = await c.req.json().catch(() => null)
  const parsed = promptUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: "Invalid prompt payload", issues: parsed.error.issues },
      400,
    )
  }

  const key = c.req.param("key") as PromptKey
  const updated = await updatePrompt({
    userId: session.user.id,
    key,
    content: parsed.data.content,
  })
  if (!updated) return c.json({ error: "Prompt not found" }, 404)

  // The prompt body itself is the user's content and is not logged.
  logger.info("Prompt updated", { prompt_key: key })
  return c.json({ prompts: await listPrompts(session.user.id) })
})

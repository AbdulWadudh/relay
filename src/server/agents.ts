import { Hono } from "hono"
import {
  createAgent,
  DuplicateAgentNameError,
  deleteAgent,
  listAgents,
  setAgentActive,
  updateAgent,
} from "@/lib/agents"
import { logger } from "@/lib/observability/logger"
import { agentInputSchema, agentUpdateSchema } from "@/lib/schemas"
import { requireSession, type SessionEnv } from "@/server/require-session"

/**
 * /api/v1/agents — Human agent CRUD (TRD §3, Task 3). System agents are
 * synthesized by the processing pipeline (Task 4) and aren't creatable or
 * mutable here — see src/lib/agents.ts.
 */

export const agentsModule = new Hono<SessionEnv>()
agentsModule.use("*", requireSession)

agentsModule.get("/", async (c) => {
  const session = c.get("session")
  return c.json({ agents: await listAgents(session.user.id) })
})

agentsModule.post("/", async (c) => {
  const session = c.get("session")
  const body = await c.req.json().catch(() => null)
  const parsed = agentInputSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: "Invalid agent payload", issues: parsed.error.issues },
      400,
    )
  }
  let agent: Awaited<ReturnType<typeof createAgent>>
  try {
    agent = await createAgent(parsed.data, session.user.id)
  } catch (error) {
    // 409, not 500: the request was well-formed, the name is just taken.
    if (error instanceof DuplicateAgentNameError) {
      return c.json({ error: error.message }, 409)
    }
    throw error
  }
  logger.info("Agent created", { agentId: agent.id })
  return c.json({ agent }, 201)
})

agentsModule.put("/:id", async (c) => {
  const session = c.get("session")
  const id = c.req.param("id")
  const body = await c.req.json().catch(() => null)
  const parsed = agentUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: "Invalid agent payload", issues: parsed.error.issues },
      400,
    )
  }
  // An isActive-ONLY payload is the row's on/off switch, and every agent
  // has one — including System rows, which are otherwise not writable.
  // Anything touching a prompt or schema still goes down the human-scoped
  // path below.
  const keys = Object.keys(parsed.data)
  if (keys.length === 1 && keys[0] === "isActive") {
    const toggled = await setAgentActive(
      id,
      session.user.id,
      parsed.data.isActive === true,
    )
    if (!toggled) return c.json({ error: "Agent not found" }, 404)
    logger.info("Agent activation changed", {
      agentId: id,
      is_active: toggled.isActive,
    })
    return c.json({ agent: toggled })
  }

  let agent: Awaited<ReturnType<typeof updateAgent>>
  try {
    agent = await updateAgent(id, parsed.data, session.user.id)
  } catch (error) {
    if (error instanceof DuplicateAgentNameError) {
      return c.json({ error: error.message }, 409)
    }
    throw error
  }
  if (!agent) return c.json({ error: "Agent not found" }, 404)
  logger.info("Agent updated", { agentId: id })
  return c.json({ agent })
})

agentsModule.delete("/:id", async (c) => {
  const session = c.get("session")
  const id = c.req.param("id")
  if (!(await deleteAgent(id, session.user.id))) {
    return c.json({ error: "Agent not found" }, 404)
  }
  logger.info("Agent deleted", { agentId: id })
  return c.json({ ok: true })
})

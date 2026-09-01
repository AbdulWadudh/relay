import { and, eq, sql } from "drizzle-orm"
import { DuplicateAgentNameError, nameTaken } from "@/lib/agent-names"
import { getDb } from "@/lib/db"
import { agents } from "@/lib/db/schema"
import type { AgentInput, AgentUpdateInput } from "@/lib/schemas"

export { DuplicateAgentNameError } from "@/lib/agent-names"

/**
 * Agent service (TRD §3, Task 3).
 *
 * CLONING IS EXPLICIT (human decision 2026-09-01, replacing the earlier
 * copy-on-write behaviour). A System agent is never edited and never
 * silently forked — the UI offers "Clone", which opens the editor
 * pre-filled and CREATES a new Human agent on save. Editing a Human agent
 * saves in place, to the same id, and creates nothing.
 *
 * Copy-on-write was tried first and was wrong: "Save changes" on a
 * built-in quietly minted a new row, so a user who pressed it twice ended
 * up with duplicates and no way to tell which one the pipeline would use.
 */

export interface AgentSummary {
  id: string
  type: "system" | "human"
  name: string
  description: string
  systemPrompt: string
  expectedOutputSchema: Record<string, unknown>
  config: Record<string, unknown>
  isActive: boolean
  /**
   * True only for the agents this codebase SEEDS (they carry
   * additionalData.builtin_key). Synthesized agents are also stored with
   * type "system" so later runs reuse them, so type alone cannot tell the
   * two apart — and the difference matters: seedSystemAgents re-inserts a
   * deleted built-in on the very next run, while a deleted synthesized
   * agent stays gone.
   */
  builtin: boolean
  createdAt: number
}

function toSummary(row: typeof agents.$inferSelect): AgentSummary {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description,
    systemPrompt: row.systemPrompt,
    expectedOutputSchema: row.expectedOutputSchema,
    config: row.config,
    isActive: Boolean(row.isActive),
    builtin: typeof row.additionalData?.builtin_key === "string",
    createdAt: row.createdAt,
  }
}

export async function listAgents(userId: string): Promise<AgentSummary[]> {
  const rows = await getDb()
    .select()
    .from(agents)
    .where(eq(agents.userId, userId))
    .orderBy(agents.createdAt)
    .all()
  return rows.map(toSummary)
}

export async function createAgent(
  input: AgentInput,
  userId: string,
): Promise<AgentSummary> {
  if (await nameTaken(userId, input.name)) {
    throw new DuplicateAgentNameError(input.name)
  }
  const [row] = await getDb()
    .insert(agents)
    .values({
      id: crypto.randomUUID(),
      userId,
      type: "human",
      name: input.name,
      description: input.description,
      systemPrompt: input.systemPrompt,
      expectedOutputSchema: input.expectedOutputSchema,
      config: input.config,
      isActive: input.isActive ? 1 : 0,
      createdAt: Date.now(),
    })
    .returning()
    .all()
  return toSummary(row)
}

/**
 * In-place update of a Human agent. System rows are excluded by the WHERE
 * clause rather than forked: the caller wanting a variant clones first,
 * which is a separate, explicit create.
 */
export async function updateAgent(
  id: string,
  input: AgentUpdateInput,
  userId: string,
): Promise<AgentSummary | null> {
  if (input.name !== undefined && (await nameTaken(userId, input.name, id))) {
    throw new DuplicateAgentNameError(input.name)
  }
  const updates: Partial<typeof agents.$inferInsert> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.systemPrompt !== undefined)
    updates.systemPrompt = input.systemPrompt
  if (input.expectedOutputSchema !== undefined) {
    updates.expectedOutputSchema = input.expectedOutputSchema
  }
  if (input.config !== undefined) updates.config = input.config
  if (input.isActive !== undefined) updates.isActive = input.isActive ? 1 : 0

  const [row] = await getDb()
    .update(agents)
    .set(updates)
    .where(
      and(
        eq(agents.id, id),
        eq(agents.userId, userId),
        eq(agents.type, "human"),
      ),
    )
    .returning()
    .all()
  return row ? toSummary(row) : null
}

/**
 * Turns an agent on or off for routing.
 *
 * Deliberately NOT scoped to `type = "human"` like the edit path is. A
 * synthesized agent is stored as "system" so later runs reuse it, and the
 * two seeded built-ins cannot be deleted at all (they come straight back),
 * so switching them off is the ONLY way to stop them being routed to.
 * `seedSystemAgents` never writes `is_active`, so this sticks.
 *
 * Only the flag is writable here — prompts and schemas on System rows stay
 * off-limits, which is the assumption the seeder's refresh relies on.
 */
export async function setAgentActive(
  id: string,
  userId: string,
  isActive: boolean,
): Promise<AgentSummary | null> {
  const [row] = await getDb()
    .update(agents)
    .set({ isActive: isActive ? 1 : 0 })
    .where(and(eq(agents.id, id), eq(agents.userId, userId)))
    .returning()
    .all()
  return row ? toSummary(row) : null
}

/**
 * Deletes any of the user's own agents EXCEPT a seeded built-in.
 *
 * Synthesized agents are `type: "system"` too, and the pipeline mints one
 * every time routing declines — so scoping deletion to "human" made that
 * sprawl permanent and unremovable. The real dividing line is
 * `additional_data.builtin_key`, which only seeded definitions carry:
 * deleting one of those is futile because the next run re-inserts it.
 */
export async function deleteAgent(
  id: string,
  userId: string,
): Promise<boolean> {
  const deleted = await getDb()
    .delete(agents)
    .where(
      and(
        eq(agents.id, id),
        eq(agents.userId, userId),
        sql`json_extract(${agents.additionalData}, '$.builtin_key') IS NULL`,
      ),
    )
    .returning({ id: agents.id })
    .all()
  return deleted.length > 0
}

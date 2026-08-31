import { and, eq } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { agents } from "@/lib/db/schema"
import type { AgentInput, AgentUpdateInput } from "@/lib/schemas"

/**
 * Agent service (TRD §3, Task 3). Only Human agents are mutable through
 * this API — System agents are auto-synthesized by the processing pipeline
 * (TRD Task 4) and are read-only here, matched by excluding `type` from the
 * update/delete WHERE clause everywhere except "human".
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

export async function updateAgent(
  id: string,
  input: AgentUpdateInput,
  userId: string,
): Promise<AgentSummary | null> {
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
        eq(agents.type, "human"),
      ),
    )
    .returning({ id: agents.id })
    .all()
  return deleted.length > 0
}

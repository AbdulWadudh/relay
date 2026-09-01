import { and, eq, ne, sql } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { agents } from "@/lib/db/schema"

/**
 * Agent name uniqueness, split out of agents.ts to respect the 250-line
 * cap (RULES.md).
 */

/**
 * Two Human agents with the same name are indistinguishable in the list
 * and ambiguous to the router, which presents agents by name. Enforced in
 * the service rather than as a DB constraint so the API can return a 409
 * the UI can explain, and so System rows (which a fork legitimately shares
 * a name with until renamed) are unaffected.
 */
export class DuplicateAgentNameError extends Error {
  readonly code = "DUPLICATE_AGENT_NAME"

  constructor(name: string) {
    super(`You already have an agent called "${name}".`)
    this.name = "DuplicateAgentNameError"
  }
}

export async function nameTaken(
  userId: string,
  name: string,
  exceptId?: string,
): Promise<boolean> {
  const clauses = [
    eq(agents.userId, userId),
    eq(agents.type, "human"),
    // Case- and whitespace-insensitive: "Recipe" and "recipe " are the
    // same agent to a reader, so they collide here too.
    sql`lower(trim(${agents.name})) = ${name.trim().toLowerCase()}`,
  ]
  if (exceptId) clauses.push(ne(agents.id, exceptId))
  const row = await getDb()
    .select({ id: agents.id })
    .from(agents)
    .where(and(...clauses))
    .get()
  return Boolean(row)
}

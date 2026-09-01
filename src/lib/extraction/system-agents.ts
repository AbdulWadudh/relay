import { and, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { agents } from "@/lib/db/schema"
import type { SchemaFragment } from "@/lib/extraction/evidence"
import { PLACE_PROMPT, PLACE_SCHEMA } from "@/lib/extraction/schemas/place"
import { RECIPE_PROMPT, RECIPE_SCHEMA } from "@/lib/extraction/schemas/recipe"

/**
 * The built-in System agents (PRD §4.3): `Recipe` and `Location/Place`.
 *
 * Seeded per user and idempotent — a user who already has them keeps their
 * row ids, so runs that referenced an agent still resolve. Rows carry
 * `additional_data.builtin_key`, which is how a re-seed tells a built-in it
 * owns apart from a System agent the synthesizer created (Task 4.4
 * routing); only the former is refreshed when a definition changes here.
 *
 * Every schema requires an `evidence` object on every extracted property —
 * the grounding guarantee lives in the SCHEMA, not only in the prompt, so
 * validation rejects an ungrounded value before it can ever be persisted.
 */

export interface SystemAgentDefinition {
  /** Stable key stored on the row; renaming the agent won't duplicate it. */
  key: string
  name: string
  description: string
  /** What this agent claims to cover — used by routing to match a clip. */
  covers: string
  /** Notion Guides category this agent's pages file under. */
  category: string
  /** Emoji for that category page and its rows. */
  emoji: string
  systemPrompt: string
  expectedOutputSchema: SchemaFragment
}

export const SYSTEM_AGENTS: readonly SystemAgentDefinition[] = [
  {
    key: "recipe",
    name: "Recipe",
    description:
      "Turns a cooking clip into ingredients, ordered steps, and timings.",
    covers:
      "cooking, baking, drinks, food preparation — anything where someone makes something edible",
    category: "Recipe",
    emoji: "🍳",
    systemPrompt: RECIPE_PROMPT,
    expectedOutputSchema: RECIPE_SCHEMA,
  },
  {
    key: "place",
    name: "Location/Place",
    description:
      "Turns a travel or venue clip into a place, its highlights, and visiting notes.",
    covers:
      "travel, restaurants, cafes, hotels, attractions, neighbourhoods — anything about somewhere you can go",
    category: "Places",
    emoji: "📍",
    systemPrompt: PLACE_PROMPT,
    expectedOutputSchema: PLACE_SCHEMA,
  },
]

/**
 * Creates any missing built-in for this user and refreshes the ones whose
 * definition has changed here. Safe to call on every run.
 */
export async function seedSystemAgents(userId: string): Promise<void> {
  const db = getDb()
  const existing = await db
    .select()
    .from(agents)
    .where(and(eq(agents.userId, userId), eq(agents.type, "system")))
    .all()

  for (const definition of SYSTEM_AGENTS) {
    const row = existing.find(
      (candidate) => candidate.additionalData?.builtin_key === definition.key,
    )
    const additionalData = {
      builtin_key: definition.key,
      covers: definition.covers,
      category: definition.category,
      emoji: definition.emoji,
    }

    if (!row) {
      await db
        .insert(agents)
        .values({
          id: crypto.randomUUID(),
          userId,
          type: "system",
          name: definition.name,
          description: definition.description,
          systemPrompt: definition.systemPrompt,
          expectedOutputSchema: definition.expectedOutputSchema,
          config: {},
          isActive: 1,
          additionalData,
          createdAt: Date.now(),
        })
        .run()
      continue
    }

    // Refresh in place when this file's definition has moved on. The user
    // cannot edit System rows (src/lib/agents.ts scopes writes to
    // type = "human"), so there is no user edit to overwrite here.
    const stale =
      row.systemPrompt !== definition.systemPrompt ||
      row.description !== definition.description ||
      row.additionalData?.category !== definition.category ||
      row.additionalData?.emoji !== definition.emoji ||
      JSON.stringify(row.expectedOutputSchema) !==
        JSON.stringify(definition.expectedOutputSchema)
    if (!stale) continue

    await db
      .update(agents)
      .set({
        name: definition.name,
        description: definition.description,
        systemPrompt: definition.systemPrompt,
        expectedOutputSchema: definition.expectedOutputSchema,
        additionalData,
      })
      .where(eq(agents.id, row.id))
      .run()
  }
}

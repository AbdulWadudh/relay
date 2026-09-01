import { and, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { agents } from "@/lib/db/schema"
import { runChat } from "@/lib/extraction/chat"
import type { SchemaFragment } from "@/lib/extraction/evidence"
import { promptFor, seedPrompts } from "@/lib/extraction/prompts"
import { synthesizeAgent } from "@/lib/extraction/synthesize"
import { seedSystemAgents } from "@/lib/extraction/system-agents"
import { parseModelJson } from "@/lib/extraction/validate"

/**
 * Agent routing (PRD §4.3, Task 4.4), in the order the brief specifies:
 *
 *   explicitly requested agent -> matching active System agent -> synthesizer
 *
 * Auto-routing considers the user's OWN agents first and System agents
 * after (human decision 2026-09-01): someone who wrote an agent for a
 * category meant it to be used for that category. Both are offered — a
 * clone is a deliberate VARIANT, not a replacement, so the built-in it
 * came from stays available and simply ranks below it.
 *
 * Both the chosen agent id AND the reason are returned so the run records
 * why it was routed the way it was — "which agent ran" is not a useful
 * audit trail without "and why".
 */

export type RoutingMode = "requested" | "human" | "system" | "synthesized"

export interface Routing {
  mode: RoutingMode
  agentId: string
  agentName: string
  systemPrompt: string
  expectedOutputSchema: SchemaFragment
  reason: string
  /** Notion Guides category and its emoji, from the agent's own row. */
  category: string
  emoji: string
  /**
   * Which model actually made the routing decision. Absent for the
   * "requested" and cached paths, where no model was consulted at all —
   * that absence is itself the useful signal on the run page.
   */
  provider?: string
  model?: string
}

/**
 * Routing only needs to recognise the KIND of clip, which the opening is
 * enough for — and the whole transcript goes over the wire again for the
 * extraction call moments later. Groq's free tier is 8000 tokens/minute,
 * so sending it twice in full is what pushes a normal run into a 429.
 */
const ROUTING_TRANSCRIPT_CHARS = 4000

function forRouting(transcript: string): string {
  return transcript.length <= ROUTING_TRANSCRIPT_CHARS
    ? transcript
    : `${transcript.slice(0, ROUTING_TRANSCRIPT_CHARS)}\n… (truncated for routing)`
}

function toRouting(
  row: typeof agents.$inferSelect,
  mode: RoutingMode,
  reason: string,
): Routing {
  const extra = row.additionalData ?? {}
  return {
    mode,
    agentId: row.id,
    agentName: row.name,
    systemPrompt: row.systemPrompt,
    expectedOutputSchema: row.expectedOutputSchema,
    reason,
    // A synthesized agent stores its own; anything older falls back to the
    // agent's name, which is already the category in every practical case.
    category:
      typeof extra.category === "string" && extra.category
        ? extra.category
        : row.name,
    emoji: typeof extra.emoji === "string" && extra.emoji ? extra.emoji : "📄",
  }
}

/** The agent the user picked on the run, if it is still theirs to pick. */
async function requestedAgent(
  agentId: string,
  userId: string,
): Promise<Routing | null> {
  const row = await getDb()
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
    .get()
  if (!row) return null
  // An explicit request wins even if the agent is switched off — the user
  // named it on this run, which is a stronger signal than the toggle.
  const note = row.isActive ? "" : " (agent is inactive, but was requested)"
  return toRouting(row, "requested", `Requested on the run${note}`)
}

/**
 * Candidates in priority order: the user's own agents, then the System
 * agents none of them supersede.
 */
export async function routableAgents(userId: string) {
  const rows = await getDb()
    .select()
    .from(agents)
    .where(and(eq(agents.userId, userId), eq(agents.isActive, 1)))
    .orderBy(agents.createdAt)
    .all()

  const human = rows.filter((row) => row.type === "human")
  const superseded = new Set(
    human
      .map((row) => row.additionalData?.cloned_from)
      .filter((id): id is string => typeof id === "string"),
  )
  const system = rows.filter(
    (row) => row.type === "system" && !superseded.has(row.id),
  )
  return [...human, ...system]
}

/** Asks the model which System agent, if any, covers this transcript. */
async function classify(options: {
  userId: string
  candidates: (typeof agents.$inferSelect)[]
  title: string | null
  transcript: string
  signal?: AbortSignal
}): Promise<{
  index: number
  reason: string
  provider: string
  model: string
}> {
  const { userId, candidates, title, transcript, signal } = options
  const listing = candidates
    .map((row, index) => {
      const covers = row.additionalData?.covers
      const scope = typeof covers === "string" && covers ? covers : ""
      return `${index + 1}. ${row.name} — ${row.description}${scope ? `\n   Covers: ${scope}` : ""}`
    })
    .join("\n")

  const run = await runChat({
    userId,
    task: "synthesis",
    system: await promptFor(userId, "agent_router"),
    user: `Agents:\n${listing}\n\nVideo title: ${title ?? "(none)"}\n\nTranscript:\n${forRouting(transcript)}`,
    signal,
  })

  const parsed = parseModelJson(run.content)
  if (!parsed.ok || typeof parsed.value !== "object" || parsed.value === null) {
    return {
      index: 0,
      reason: "Router returned no usable choice",
      provider: run.provider,
      model: run.model,
    }
  }
  const value = parsed.value as Record<string, unknown>
  const choice = typeof value.choice === "number" ? value.choice : 0
  const reason =
    typeof value.reason === "string" && value.reason.trim().length > 0
      ? value.reason.trim()
      : "No reason given"
  const inRange = choice >= 1 && choice <= candidates.length
  return {
    index: inRange ? choice : 0,
    reason,
    provider: run.provider,
    model: run.model,
  }
}

export async function routeAgent(options: {
  userId: string
  requestedAgentId: string | null
  title: string | null
  transcript: string
  signal?: AbortSignal
}): Promise<Routing> {
  const { userId, requestedAgentId, title, transcript, signal } = options

  if (requestedAgentId) {
    const requested = await requestedAgent(requestedAgentId, userId)
    if (requested) return requested
    // Fall through rather than fail: the agent was deleted between
    // submitting the run and the worker picking it up.
  }

  // Idempotent, so the built-ins exist for users who signed up before this
  // task shipped, and for anyone whose row was removed out of band.
  await Promise.all([seedSystemAgents(userId), seedPrompts(userId)])

  const candidates = await routableAgents(userId)
  if (candidates.length > 0) {
    const { index, reason, provider, model } = await classify({
      userId,
      candidates,
      title,
      transcript,
      signal,
    })
    if (index > 0) {
      const chosen = candidates[index - 1]
      return {
        ...toRouting(
          chosen,
          chosen.type === "human" ? "human" : "system",
          reason,
        ),
        provider,
        model,
      }
    }
  }

  // The synthesizer sees the same candidates and may hand one back
  // instead of building: it has named the category by then, so it catches
  // duplicates the router could not (src/lib/extraction/synthesize.ts).
  const synthesized = await synthesizeAgent({
    userId,
    title,
    transcript,
    candidates,
    signal,
  })
  return {
    mode: synthesized.reused ? "system" : "synthesized",
    agentId: synthesized.id,
    agentName: synthesized.name,
    systemPrompt: synthesized.systemPrompt,
    expectedOutputSchema: synthesized.expectedOutputSchema,
    reason: synthesized.reason,
    category: synthesized.category,
    emoji: synthesized.emoji,
  }
}

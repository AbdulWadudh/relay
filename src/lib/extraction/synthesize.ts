import { getDb } from "@/lib/db"
import { agents } from "@/lib/db/schema"
import { runChat } from "@/lib/extraction/chat"
import type { SchemaFragment } from "@/lib/extraction/evidence"
import { promptFor } from "@/lib/extraction/prompts"
import { parseModelJson } from "@/lib/extraction/validate"

/**
 * The dynamic schema synthesizer (PRD §4.3) — the fallback when a clip
 * matches no System agent.
 *
 * The model does NOT author the JSON Schema. It proposes a field PLAN
 * (names, kinds, descriptions) and this module compiles that plan into a
 * schema, injecting the evidence contract on every field itself. A model
 * asked to write JSON Schema directly will sooner or later emit one where
 * `evidence` is optional, and that schema would then be persisted and
 * reused — the grounding guarantee has to be structural, not requested.
 *
 * Synthesized agents are persisted as `type: "system"` rows so a later run
 * in the same category reuses them (human decision 2026-09-01). They are
 * read-only in the Agents UI like every other System row.
 */

interface FieldPlan {
  key: string
  kind: "scalar" | "list"
  item_key?: string
  description?: string
  required?: boolean
}

interface Plan {
  name: string
  emoji?: string
  description: string
  covers: string
  system_prompt: string
  fields: FieldPlan[]
}

const KEY = /^[a-z][a-z0-9_]{0,48}$/

function isPlan(value: unknown): value is Plan {
  if (typeof value !== "object" || value === null) return false
  const plan = value as Record<string, unknown>
  return (
    typeof plan.name === "string" &&
    plan.name.trim().length > 0 &&
    typeof plan.system_prompt === "string" &&
    plan.system_prompt.trim().length > 0 &&
    Array.isArray(plan.fields) &&
    plan.fields.length > 0
  )
}

/**
 * Compiles the plan into a JSON Schema. Every scalar becomes a cited value
 * and every list entry carries its own evidence, so the contract holds no
 * matter what the model proposed.
 */
function compile(fields: FieldPlan[]): {
  schema: SchemaFragment
  usable: FieldPlan[]
} {
  // EVERY synthesized schema gets a title and a summary, whatever the
  // model proposed. They are what the published page is built around —
  // its heading and its opening paragraph — and a plan without them
  // produced a page titled with the raw source caption and no lead.
  const asText = (description: string): SchemaFragment => ({
    type: "string",
    description,
  })
  const properties: Record<string, SchemaFragment> = {
    title: asText(
      "The subject of this video IN ENGLISH, Title Case, as a person would name it — the tool, the place, the routine. Not the creator's marketing line, and never another language. Ignore the source title if it is a hook like 'This tool is INSANE'.",
    ),
    summary: asText(
      "Two or three complete sentences introducing the subject: what it is, and why someone would care. Proper capitalisation and full stops.",
    ),
  }
  const required: string[] = ["title", "summary"]
  const usable: FieldPlan[] = []

  for (const field of fields) {
    if (!KEY.test(field.key ?? "")) continue
    // The injected pair is not overridable by the plan.
    if (field.key === "title" || field.key === "summary") continue
    const description = field.description ?? field.key.replace(/_/g, " ")

    if (field.kind === "list") {
      const itemKey = KEY.test(field.item_key ?? "")
        ? (field.item_key as string)
        : "item"
      properties[field.key] = {
        type: "array",
        description,
        items: {
          type: "object",
          additionalProperties: false,
          required: [itemKey],
          properties: { [itemKey]: { type: "string", description } },
        },
      }
    } else {
      properties[field.key] = asText(description)
    }

    usable.push(field)
    if (field.required && required.length < 4) required.push(field.key)
  }

  return {
    schema: {
      type: "object",
      additionalProperties: false,
      ...(required.length > 0 ? { required } : {}),
      properties,
    },
    usable,
  }
}

/**
 * A reuse decision from the synthesizer: it was shown the existing agents
 * and judged that one already covers this category.
 *
 * This is the last line of defence against agent sprawl. The router sees
 * only the transcript and declines when unsure; by this point the
 * synthesizer has NAMED the category, so it can recognise "this is the
 * Animals agent" where the router saw an unfamiliar kitten video.
 *
 * Lexical similarity cannot do this job — "kitten / milestones" and
 * "cat / hydration" share essentially no words while being one category,
 * which is exactly the duplicate pair this exists to stop.
 */
interface Reuse {
  reuse: number
  reason?: string
}

function isReuse(value: unknown): value is Reuse {
  return (
    typeof value === "object" &&
    value !== null &&
    Number.isInteger((value as Record<string, unknown>).reuse)
  )
}

export interface SynthesizedAgent {
  id: string
  name: string
  description: string
  systemPrompt: string
  expectedOutputSchema: SchemaFragment
  /** Notion Guides category this agent's pages file under, and its emoji. */
  category: string
  emoji: string
  /** True when an existing agent was reused rather than a new one built. */
  reused: boolean
  /** Why this agent was reused or created — recorded on the run. */
  reason: string
}

function describe(row: typeof agents.$inferSelect, index: number): string {
  const covers = row.additionalData?.covers
  const scope = typeof covers === "string" && covers ? covers : ""
  const head = `${index + 1}. ${row.name} — ${row.description}`
  return scope ? `${head}\n   Covers: ${scope}` : head
}

function fromExisting(
  row: typeof agents.$inferSelect,
  reason: string,
): SynthesizedAgent {
  const extra = (row.additionalData ?? {}) as Record<string, unknown>
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    systemPrompt: row.systemPrompt,
    expectedOutputSchema: row.expectedOutputSchema as SchemaFragment,
    category: String(extra.category ?? row.name),
    emoji: String(extra.emoji ?? "📄"),
    reused: true,
    reason,
  }
}

export async function synthesizeAgent(options: {
  userId: string
  title: string | null
  transcript: string
  /** Existing routable agents, offered to the model for reuse. */
  candidates: (typeof agents.$inferSelect)[]
  signal?: AbortSignal
}): Promise<SynthesizedAgent> {
  const { userId, title, transcript, candidates, signal } = options
  const listing = candidates.map(describe).join("\n")

  const run = await runChat({
    userId,
    stage: "schema_synthesizer",
    system: await promptFor(userId, "schema_synthesizer"),
    user: `Existing agents:\n${listing || "(none)"}\n\nVideo title: ${title ?? "(none)"}\n\nTranscript:\n${transcript}`,
    signal,
  })

  const parsed = parseModelJson(run.content)

  // Reuse wins over building. Out-of-range indices fall through to
  // building rather than throwing — a bad number must not fail the run.
  if (parsed.ok && isReuse(parsed.value)) {
    const chosen = candidates[parsed.value.reuse - 1]
    if (chosen) {
      return fromExisting(
        chosen,
        parsed.value.reason?.trim() ||
          `Reused ${chosen.name}, which already covers this category`,
      )
    }
  }

  if (!parsed.ok || !isPlan(parsed.value)) {
    throw new Error("The schema synthesizer did not return a usable plan.")
  }
  const plan = parsed.value
  const { schema, usable } = compile(plan.fields)
  if (usable.length === 0) {
    throw new Error("The schema synthesizer proposed no usable fields.")
  }

  const now = Date.now()
  const [row] = await getDb()
    .insert(agents)
    .values({
      id: crypto.randomUUID(),
      userId,
      type: "system",
      name: plan.name.slice(0, 120),
      description: (plan.description ?? "").slice(0, 280),
      systemPrompt: plan.system_prompt,
      expectedOutputSchema: schema,
      config: {},
      isActive: 1,
      additionalData: {
        // No `builtin_key`, so a re-seed of the built-ins leaves this row
        // alone (see system-agents.ts).
        synthesized: true,
        synthesized_at: now,
        covers: plan.covers ?? "",
        category: plan.name.slice(0, 120),
        // One grapheme only — Notion rejects a multi-character "emoji".
        emoji: [...(plan.emoji ?? "")][0] ?? "📄",
        model: `${run.provider}:${run.model}`,
        field_plan: usable,
      },
      createdAt: now,
    })
    .returning()
    .all()

  const extra = row.additionalData as Record<string, unknown>
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    systemPrompt: row.systemPrompt,
    expectedOutputSchema: row.expectedOutputSchema,
    category: String(extra.category ?? row.name),
    emoji: String(extra.emoji ?? "📄"),
    reused: false,
    reason: "No existing agent covered this category; a schema was synthesized",
  }
}

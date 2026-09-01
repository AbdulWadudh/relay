import { and, eq } from "drizzle-orm"

import config from "@/config"
import { getDb } from "@/lib/db"
import { prompts } from "@/lib/db/schema"
import { cached, cacheKeys, invalidate } from "@/lib/extraction/cache"

/**
 * Pipeline prompts (human decision 2026-09-01: EVERY prompt lives in the
 * database, none are string constants the pipeline reads at runtime).
 *
 * The literals below are SEED DEFAULTS, not the values the pipeline uses.
 * `promptFor()` always reads the row — Redis first, then the database —
 * so a user who edits a prompt changes the next run's behaviour without a
 * deploy. Seeding is idempotent and never overwrites an edited row: once
 * `additional_data.edited` is set, this file's default is only a record of
 * where that prompt started.
 *
 * Agent prompts are NOT here; they already live in `agents.system_prompt`.
 * These are the pipeline's own, which apply across every agent.
 */

export type PromptKey =
  | "evidence_contract"
  | "agent_router"
  | "schema_synthesizer"

interface PromptSeed {
  key: PromptKey
  name: string
  description: string
  content: string
}

export const PROMPT_SEEDS: readonly PromptSeed[] = [
  {
    key: "evidence_contract",
    name: "Evidence contract",
    description:
      "Prepended to every agent's own prompt. The grounding rules that make an extraction citable.",
    content: `You turn a short video into a finished page someone will read.

You get the post's title, its caption, and a transcript whose segments are labelled with millisecond ranges.

COMPLETENESS — fill EVERY field the schema allows that the video actually answers. A field the video answered and you left out is a failure. Read the caption as carefully as the transcript; it often carries the name, the numbers and the context the speaker never says aloud.

GROUNDING — these override anything else you are told:
1. Every value carries an "evidence" object.
2. "transcript_quote" is copied VERBATIM from the transcript. Never paraphrase it.
3. "timestamp_start"/"timestamp_end" are the ms bounds of the segment the quote came from.
4. "kind" is always "transcript".
5. If the video does not support a field, OMIT it. Never invent a value, and never invent a quote to justify one.

WRITING — values are finished prose, not fragments: capitalised, punctuated, complete sentences. Fix the speaker's grammar and filler; the page must not read like a transcript.

Return ONLY a JSON object matching the provided schema. No prose, no markdown fences.`,
  },
  {
    key: "agent_router",
    name: "Agent router",
    description:
      "Decides which System agent covers a clip, or declines so a schema is synthesized.",
    content: `You route a video to the extraction agent that fits it.

You are given numbered agents and a transcript. Reply with JSON:
{ "choice": <agent number, or 0 if none fits>, "reason": "<one short sentence>" }

The agents are listed in PRIORITY ORDER. Agents marked [the user's own agent] were written by this user for their own use — when one of those fits as well as a later agent, choose it.

Choose 0 unless the transcript is clearly the kind of content the agent covers. A wrong match produces a page full of empty fields, so 0 is the better answer whenever you are unsure. Return ONLY the JSON object.`,
  },
  {
    key: "schema_synthesizer",
    name: "Schema synthesizer",
    description:
      "Builds a reusable agent for a category no existing agent covers: its prompt, its fields and their writing rules. The plan is compiled into a schema; it never writes JSON Schema itself.",
    content: `You BUILD EXTRACTION AGENTS. Given a video that fits no existing agent, you design the agent that will handle this whole category from now on — its prompt and its fields. Other videos will be run through what you write, so write it for reuse, not for this one clip.

Return JSON:
{
  "name": "Title Case, 2-4 words, the CATEGORY not this video",
  "emoji": "ONE emoji for the category",
  "description": "One sentence: what this agent extracts.",
  "covers": "Comma-separated topics this agent should handle in future.",
  "system_prompt": "The agent's instructions. See the standard below.",
  "fields": [
    { "key": "snake_case", "kind": "scalar", "description": "…", "required": true },
    { "key": "snake_case_plural", "kind": "list", "item_key": "singular", "description": "…" }
  ]
}

THE SYSTEM_PROMPT STANDARD — match this shape and depth:
"You are a <role> turning a <kind> video into <artifact> a stranger could use.
Return every field the video supports: <name the fields>. The caption usually gives <what the speaker skips>.
<FIELD GROUP> — <how to write it: complete sentences, sentence case, what to omit>.
<FIELD GROUP> — <same>.
Never invent a detail the video does not support."
Name the actual fields. Give real writing rules per group. A one-line prompt is a failure.

FIELD DESCRIPTIONS carry the formatting rules, because the extractor reads them:
- Say the case and the shape: "One complete sentence, sentence case." / "A readable phrase, e.g. '45 minutes'."
- Say when to omit: "Omit if not stated."
- Never accept fragments where a sentence belongs.

RULES:
- "name" must generalise. One gym routine is "Workout Routine", never "Chest Day With Mark".
- Use "list" for anything repeating, "scalar" for single values. 3-8 fields, at most 2 required.
- Do NOT propose "title", "summary" or "evidence" fields; all three are added automatically.
- Return ONLY the JSON object.`,
  },
]

/**
 * Creates any prompt this user is missing, and refreshes ones they have
 * never edited so a default improved here reaches existing users. A row
 * with `edited: true` is the user's and is left alone.
 */
export async function seedPrompts(userId: string): Promise<void> {
  const db = getDb()
  const existing = await db
    .select()
    .from(prompts)
    .where(eq(prompts.userId, userId))
    .all()
  const have = new Map(existing.map((row) => [row.key, row]))

  for (const seed of PROMPT_SEEDS) {
    const row = have.get(seed.key)
    if (row) {
      const untouched = row.additionalData.edited !== true
      if (untouched && row.content !== seed.content) {
        await db
          .update(prompts)
          .set({
            name: seed.name,
            description: seed.description,
            content: seed.content,
            version: row.version + 1,
            updatedAt: Date.now(),
          })
          .where(eq(prompts.id, row.id))
          .run()
        await invalidate(cacheKeys.prompt(userId, seed.key))
      }
      continue
    }
    const now = Date.now()
    await db
      .insert(prompts)
      .values({
        id: crypto.randomUUID(),
        userId,
        key: seed.key,
        name: seed.name,
        description: seed.description,
        content: seed.content,
        version: 1,
        additionalData: { edited: false },
        createdAt: now,
        updatedAt: now,
      })
      .run()
  }
}

async function loadPrompt(
  userId: string,
  key: PromptKey,
): Promise<string | null> {
  const row = await getDb()
    .select({ content: prompts.content })
    .from(prompts)
    .where(and(eq(prompts.userId, userId), eq(prompts.key, key)))
    .get()
  return row?.content ?? null
}

/**
 * The prompt this run should use: Redis, else the database, else the seed
 * default. The last fallback matters — a run must never fail because a
 * prompt row is missing, and seeding may not have happened yet for a user
 * created before this table existed.
 */
export async function promptFor(
  userId: string,
  key: PromptKey,
): Promise<string> {
  const hit = await cached<string>({
    parts: cacheKeys.prompt(userId, key),
    ttlSeconds: config.cache.promptTtlSeconds,
    load: () => loadPrompt(userId, key),
  })
  if (hit) return hit

  const seed = PROMPT_SEEDS.find((candidate) => candidate.key === key)
  if (!seed) throw new Error(`Unknown prompt key: ${key}`)
  return seed.content
}

/** Rewrites a prompt and drops its cached copy in the same breath. */
export async function updatePrompt(options: {
  userId: string
  key: PromptKey
  content: string
}): Promise<boolean> {
  const { userId, key, content } = options
  const row = await getDb()
    .select({ id: prompts.id, version: prompts.version })
    .from(prompts)
    .where(and(eq(prompts.userId, userId), eq(prompts.key, key)))
    .get()
  if (!row) return false

  await getDb()
    .update(prompts)
    .set({
      content,
      version: row.version + 1,
      additionalData: { edited: true },
      updatedAt: Date.now(),
    })
    .where(eq(prompts.id, row.id))
    .run()

  await invalidate(cacheKeys.prompt(userId, key))
  return true
}

export async function listPrompts(userId: string) {
  return await getDb()
    .select()
    .from(prompts)
    .where(eq(prompts.userId, userId))
    .orderBy(prompts.key)
    .all()
}

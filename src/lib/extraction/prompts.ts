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

MATCH ON CATEGORY, NOT SUBJECT. An agent covers a KIND of video, not one topic. A kitten drinking water belongs to an "Animals" agent. A walkthrough of a new note-taking app belongs to an "AI Tools" agent. Do not decline just because the agent's description does not name this specific subject — ask instead whether this video would FILL the agent's fields.

Choosing 0 creates a brand-new agent. A needless 0 fills the user's library with near-duplicates of agents they already have, so it is not the safe default.

Choose 0 only when no listed agent's category plausibly contains this video, OR when a listed agent matches in name but its fields would come back almost entirely empty. Those two cases are the real reasons to decline; uncertainty about the subject is not.

Return ONLY the JSON object.`,
  },
  {
    key: "schema_synthesizer",
    name: "Schema synthesizer",
    description:
      "Builds a reusable agent for a category no existing agent covers: its prompt, its fields and their writing rules. The plan is compiled into a schema; it never writes JSON Schema itself.",
    content: `You BUILD EXTRACTION AGENTS. Given a video that fits no existing agent, you design the agent that will handle this whole category from now on — its prompt and its fields. Other videos will be run through what you write, so write it for reuse, not for this one clip.

FIRST, CHECK FOR REUSE. You are shown the agents that already exist. The router that ran before you only saw the transcript and may have missed the category; you are naming the category, so you can judge this better than it could.

If one of the existing agents already covers the CATEGORY this video belongs to, do not build anything. Return exactly:
{ "reuse": <agent number>, "reason": "<one short sentence>" }

Judge by category, not by wording. A kitten settling into a home and a cat drinking water are both an ANIMALS agent — they share almost no vocabulary but they are one category. A note-taking app demo and an image generator demo are both an AI TOOLS agent. Ask: would the existing agent's FIELDS be filled by this video? If yes, reuse it.

Building a near-duplicate is the failure this check exists to prevent — every one you create is permanent and dilutes routing for every future video. Only build when no existing agent's category contains this video.

OTHERWISE, build the agent. Return JSON:
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
- "name" is the BROADEST category that would still cover sibling videos — not this video's subject. Abstract upward until the name would fit a dozen other clips you have not seen:
    "Animals"       not "Kitten Introduction", and not "Animal Drinking"
    "AI Tools"      not "AI Tool Overview"
    "Workout Routine" not "Chest Day With Mark"
  Where two candidate names differ only in specificity, always take the broader one. This agent will be reused hundreds of times; a name that reads like one video's title is a failure.
- "covers" is what makes future routing work — list the sibling topics generously, so the router recognises this agent instead of building a near-duplicate of it later.
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

/**
 * Restores a prompt to the shipped default.
 *
 * Clearing `edited` is the point, not a side effect: `seedPrompts` skips
 * any row a user has touched, so an edited prompt is frozen forever and
 * silently misses every later improvement to the default. Resetting puts
 * the row back under that refresh.
 */
export async function resetPrompt(options: {
  userId: string
  key: PromptKey
}): Promise<boolean> {
  const { userId, key } = options
  const seed = PROMPT_SEEDS.find((candidate) => candidate.key === key)
  if (!seed) return false

  const row = await getDb()
    .select({ id: prompts.id, version: prompts.version })
    .from(prompts)
    .where(and(eq(prompts.userId, userId), eq(prompts.key, key)))
    .get()
  if (!row) return false

  await getDb()
    .update(prompts)
    .set({
      content: seed.content,
      version: row.version + 1,
      additionalData: { edited: false },
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

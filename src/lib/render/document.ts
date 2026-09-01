import { type ExtractedField, readFields } from "@/lib/extraction/shape"

/**
 * The destination-independent document (Task 4.6).
 *
 * A TREE, never a Markdown string — a string would force every future
 * destination to re-parse structure it already had.
 *
 * This builds a page for a PERSON. An earlier version walked the
 * extraction generically and emitted one heading per field with an
 * evidence toggle under every line; it read as a database dump. Evidence
 * is deliberately absent here (human decision 2026-09-01) — it is for
 * analytics and lives on the run detail page, not on the published page.
 */

export type DocNode =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "callout"; text: string }
  | { type: "divider" }
  /** Label/value pairs shown together, e.g. servings · time · cuisine. */
  | { type: "facts"; facts: { label: string; value: string }[] }
  | { type: "bullet"; text: string }
  | { type: "step"; text: string; note: string | null }
  | { type: "caption"; text: string }

export interface RelayDocument {
  title: string
  /** The lead sentence, reused as the database row's Summary column. */
  summary: string | null
  blocks: DocNode[]
}

/**
 * Scalars that belong in the lead rather than in a section of their own,
 * and the order they read best in. Anything not listed still appears —
 * this only controls what gets promoted to the summary block.
 */
const LEAD_FIELDS = ["summary", "description", "overview"]
const FACT_FIELDS = [
  "servings",
  "total_time",
  "time",
  "difficulty",
  "cuisine",
  "category",
  "location",
  "cost",
  "price",
  "best_time",
  "nutrition",
]
/** Ordered content gets numbered steps rather than bullets. */
const ORDERED_FIELD = /step|instruction|direction|procedure|method|sequence/i

function sentence(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length === 0) return trimmed
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/** "Ends a step" — adds the full stop the model sometimes forgets. */
function terminated(text: string): string {
  const clean = sentence(text)
  return /[.!?…]$/.test(clean) ? clean : `${clean}.`
}

/**
 * A bullet is the model's own line, verbatim.
 *
 * An earlier version composed it here by joining quantity and name, which
 * cannot produce correct English — "2 cups of water" needs the "of" that
 * "2 onions" must not have — and produced "A pinch salt" and "A chicken
 * stock cube chicken stock cube". Composing a readable line is the
 * model's job; the structured fields beside it are for indexing.
 */
function itemLine(item: { text: string }): string {
  return sentence(item.text)
}

/**
 * A step's aside. A bare duration ("about 15 minutes") reads as a stray
 * line under the step, so it is labelled; anything else is prose and is
 * punctuated as a sentence.
 */
function stepNote(extras: { label: string; value: string }[]): string | null {
  const parts = extras.map((extra) =>
    /duration|time/i.test(extra.label)
      ? `Takes ${extra.value.replace(/^takes\s+/i, "")}`
      : terminated(extra.value),
  )
  return parts.length > 0 ? parts.join(" · ") : null
}

function sectionFor(field: ExtractedField): DocNode[] {
  const items = field.items ?? []
  if (items.length === 0) return []

  const ordered = ORDERED_FIELD.test(field.key)
  const blocks: DocNode[] = [{ type: "heading", text: field.label }]

  for (const item of items) {
    if (ordered) {
      blocks.push({
        type: "step",
        text: terminated(item.text),
        note: stepNote(item.extras),
      })
    } else {
      blocks.push({ type: "bullet", text: itemLine(item) })
    }
  }
  return blocks
}

export function buildDocument(options: {
  title: string
  extraction: Record<string, unknown>
  sourceUrl: string
  agentName: string
}): RelayDocument {
  const { title, extraction, sourceUrl, agentName } = options
  const fields = readFields(extraction)
  const byKey = new Map(fields.map((f) => [f.key, f]))
  const used = new Set<string>()

  const blocks: DocNode[] = []

  // THE AGENT'S OWN TITLE WINS. The source title is whatever the platform
  // had — an Instagram caption's first line ("29g protein & 405 calories
  // per serving 🍛") or a Hindi YouTube title — while the agent produces a
  // proper English name for the thing itself ("Chicken Jollof Rice"). The
  // source title is only the fallback for an agent whose schema has no
  // title field. Either way it is not repeated as a heading, which is one
  // of the things that made the old page read as a dump.
  const titleField = fields.find((f) => f.key === "title" || f.key === "name")
  const pageTitle = titleField?.scalar?.text?.trim() || title
  if (titleField?.scalar) used.add(titleField.key)

  let summary: string | null = null
  for (const key of LEAD_FIELDS) {
    const field = byKey.get(key)
    if (!field?.scalar) continue
    summary = terminated(field.scalar.text)
    blocks.push({ type: "callout", text: summary })
    used.add(key)
    break
  }

  const facts = FACT_FIELDS.map((key) => {
    const field = byKey.get(key)
    if (!field?.scalar) return null
    used.add(key)
    return { label: field.label, value: sentence(field.scalar.text) }
  }).filter((f): f is { label: string; value: string } => f !== null)

  if (facts.length > 0) {
    blocks.push({ type: "heading", text: "At a glance" })
    blocks.push({ type: "facts", facts })
  }

  // Lists first — they are the substance of the page.
  for (const field of fields) {
    if (used.has(field.key) || !field.items) continue
    blocks.push(...sectionFor(field))
    used.add(field.key)
  }

  // Any remaining scalar gets its own short section rather than being
  // dropped; nothing the agent extracted disappears from the page.
  for (const field of fields) {
    if (used.has(field.key) || !field.scalar) continue
    blocks.push({ type: "heading", text: field.label })
    blocks.push({ type: "paragraph", text: terminated(field.scalar.text) })
  }

  blocks.push({ type: "divider" })
  blocks.push({
    type: "caption",
    text: `Extracted by Relay from ${sourceUrl} using the ${agentName} agent.`,
  })

  return { title: sentence(pageTitle), summary, blocks }
}

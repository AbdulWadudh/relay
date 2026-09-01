/**
 * Reading an agent's output without knowing its schema.
 *
 * The shape comes from whichever agent ran, so nothing here can be written
 * against named fields. The one guarantee is the evidence contract: every
 * extracted value sits beside an `evidence` object. Pure TypeScript, no
 * React — the run detail page AND the worker's document renderer both read
 * extractions through this.
 */

export interface Evidence {
  kind: "transcript" | "visual"
  timestampStart: number | null
  timestampEnd: number | null
  /** The verbatim quote, or the on-screen text for the visual tier. */
  text: string
}

export interface ExtractedItem {
  /**
   * Stable identity for rendering. Assigned here rather than in the view
   * because position IS part of what identifies an item — two identical
   * steps in one recipe are legitimate, so the text alone is not unique.
   */
  id: string
  /**
   * RFC 6901 pointer to this item in the extraction, matching the one the
   * verifier recorded — how a claim is joined to its finding.
   */
  pointer: string
  /** The field's own text, e.g. the ingredient or the step. */
  text: string
  /** Everything else the schema put on this item, e.g. quantity. */
  extras: { label: string; value: string }[]
  evidence: Evidence | null
}

export interface ExtractedField {
  key: string
  label: string
  /** A single cited value, e.g. the recipe title. */
  scalar: ExtractedItem | null
  /** A repeating field, e.g. ingredients or steps. */
  items: ExtractedItem[] | null
}

/** RFC 6901 escaping, matching src/lib/extraction/verify.ts. */
function pointerSegment(key: string): string {
  return key.replace(/~/g, "~0").replace(/\//g, "~1")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** snake_case and camelCase both become "Sentence case". */
export function humanise(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function readEvidence(value: unknown): Evidence | null {
  if (!isRecord(value)) return null
  if (value.kind === "visual") {
    const text = value.on_screen_text
    if (typeof text !== "string") return null
    const at = value.frame_timestamp
    return {
      kind: "visual",
      timestampStart: typeof at === "number" ? at : null,
      timestampEnd: null,
      text,
    }
  }
  const quote = value.transcript_quote
  if (typeof quote !== "string") return null
  const start = value.timestamp_start
  const end = value.timestamp_end
  return {
    kind: "transcript",
    timestampStart: typeof start === "number" ? start : null,
    timestampEnd: typeof end === "number" ? end : null,
    text: quote,
  }
}

function scalarText(value: unknown): string | null {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

/**
 * Turns one object into a displayable item. The PRIMARY text is whichever
 * key the schema named it — `value` for a cited scalar, otherwise the
 * first string property. Everything else becomes an extra, so a schema
 * with `quantity` or `duration` renders those without the UI knowing they
 * exist.
 */
export function readItem(value: unknown): ExtractedItem | null {
  if (!isRecord(value)) {
    const text = scalarText(value)
    return text === null
      ? null
      : { id: "", pointer: "", text, extras: [], evidence: null }
  }

  const evidence = readEvidence(value.evidence)
  const entries = Object.entries(value).filter(([key]) => key !== "evidence")

  let primary: string | null = scalarText(value.value)
  const extras: { label: string; value: string }[] = []
  for (const [key, raw] of entries) {
    if (key === "value" && primary !== null) continue
    const text = scalarText(raw)
    if (text === null || text.length === 0) continue
    if (primary === null) {
      primary = text
      continue
    }
    extras.push({ label: humanise(key), value: text })
  }

  if (primary === null) return null
  return { id: "", pointer: "", text: primary, extras, evidence }
}

export function readFields(data: Record<string, unknown>): ExtractedField[] {
  const fields: ExtractedField[] = []

  for (const [key, raw] of Object.entries(data)) {
    const label = humanise(key)

    if (Array.isArray(raw)) {
      const items = raw
        .map(readItem)
        .filter((item): item is ExtractedItem => item !== null)
        .map((item, index) => ({
          ...item,
          id: `${key}-${index}`,
          pointer: `/${pointerSegment(key)}/${index}`,
        }))
      if (items.length > 0) fields.push({ key, label, scalar: null, items })
      continue
    }

    const scalar = readItem(raw)
    if (scalar) {
      fields.push({
        key,
        label,
        scalar: { ...scalar, id: key, pointer: `/${pointerSegment(key)}` },
        items: null,
      })
    }
  }

  return fields
}

/** Milliseconds as `m:ss`, which is how a viewer would scrub to it. */
export function timecode(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  return `${minutes}:${String(total % 60).padStart(2, "0")}`
}

export function evidenceRange(evidence: Evidence): string | null {
  if (evidence.timestampStart === null) return null
  const start = timecode(evidence.timestampStart)
  if (evidence.timestampEnd === null) return start
  return `${start} – ${timecode(evidence.timestampEnd)}`
}

/** How many evidence objects this extraction carries, at any depth. */
export function countEvidence(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce<number>((sum, entry) => sum + countEvidence(entry), 0)
  }
  if (!isRecord(value)) return 0
  let count = 0
  for (const [key, raw] of Object.entries(value)) {
    if (key === "evidence" && readEvidence(raw)) count += 1
    else count += countEvidence(raw)
  }
  return count
}

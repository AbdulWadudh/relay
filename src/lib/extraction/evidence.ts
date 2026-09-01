/**
 * The evidence contract (PRD §4.3, §6 "100% grounding"). Every extracted
 * property carries an `evidence` object, labelled by a `kind`
 * discriminator with two tiers:
 *
 *  - `transcript` — a verbatim quote plus its ms range. Hard-verified in
 *    Task 4.5 against the English stream.
 *  - `visual` — text read off a frame (Task 4.3b). A WEAKER claim, never
 *    to be presented as equivalent (human decision 2026-09-01).
 *
 * Embedded into every agent's `expected_output_schema`, so the schema —
 * not just the prompt — makes evidence mandatory.
 */

/** JSON Schema fragment, kept loose because it is data, not a type. */
export type SchemaFragment = Record<string, unknown>

export type EvidenceKind = "transcript" | "visual"

export interface TranscriptEvidence {
  kind: "transcript"
  timestamp_start: number
  timestamp_end: number
  transcript_quote: string
}

export interface VisualEvidence {
  kind: "visual"
  frame_timestamp: number
  on_screen_text: string
}

export type Evidence = TranscriptEvidence | VisualEvidence

export const TRANSCRIPT_EVIDENCE_SCHEMA: SchemaFragment = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "timestamp_start", "timestamp_end", "transcript_quote"],
  properties: {
    kind: { const: "transcript" },
    timestamp_start: {
      type: "integer",
      minimum: 0,
      description: "Start of the spoken range, in milliseconds.",
    },
    timestamp_end: {
      type: "integer",
      minimum: 0,
      description: "End of the spoken range, in milliseconds.",
    },
    transcript_quote: {
      type: "string",
      minLength: 1,
      description:
        "Verbatim words from the English transcript that support this value. Copy them exactly; do not paraphrase.",
    },
  },
}

export const VISUAL_EVIDENCE_SCHEMA: SchemaFragment = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "frame_timestamp", "on_screen_text"],
  properties: {
    kind: { const: "visual" },
    frame_timestamp: { type: "integer", minimum: 0 },
    on_screen_text: { type: "string", minLength: 1 },
  },
}

/**
 * The union every agent schema points at. Task 4.4 only ever asks for the
 * transcript tier (there is no frame layer yet), but accepting the union
 * here means 4.3b adds a producer and a verifier branch, not a schema
 * migration across every stored agent.
 */
export const EVIDENCE_SCHEMA: SchemaFragment = {
  oneOf: [TRANSCRIPT_EVIDENCE_SCHEMA, VISUAL_EVIDENCE_SCHEMA],
}

/** A scalar the agent extracted, with the evidence that backs it. */
export function citedValue(
  description: string,
  type: "string" | "number" | "integer" = "string",
): SchemaFragment {
  return {
    type: "object",
    additionalProperties: false,
    required: ["value", "evidence"],
    properties: {
      value: { type, description },
      evidence: EVIDENCE_SCHEMA,
    },
  }
}

/** True for the `{ kind: "transcript", ... }` tier. */
export function isTranscriptEvidence(
  value: unknown,
): value is TranscriptEvidence {
  if (typeof value !== "object" || value === null) return false
  const evidence = value as Record<string, unknown>
  return (
    evidence.kind === "transcript" &&
    typeof evidence.timestamp_start === "number" &&
    typeof evidence.timestamp_end === "number" &&
    typeof evidence.transcript_quote === "string"
  )
}

/** True for the `{ kind: "visual", ... }` tier (Task 4.3b). */
export function isVisualEvidence(value: unknown): value is VisualEvidence {
  if (typeof value !== "object" || value === null) return false
  const evidence = value as Record<string, unknown>
  return (
    evidence.kind === "visual" &&
    typeof evidence.frame_timestamp === "number" &&
    typeof evidence.on_screen_text === "string"
  )
}

export function isEvidence(value: unknown): value is Evidence {
  return isTranscriptEvidence(value) || isVisualEvidence(value)
}

/**
 * The schema as the MODEL sees it: every `EVIDENCE_SCHEMA` replaced by a
 * minimal transcript-only object.
 *
 * `EVIDENCE_SCHEMA` is a two-variant `oneOf` on every property, so a
 * Recipe schema was 13 KB of which 68% was that fragment repeated eleven
 * times — enough for Groq to reject the request with "Request Entity Too
 * Large". Hoisting it into `$defs` and referencing it was tried and made
 * things worse: Groq's JSON mode returned 400 "Failed to validate JSON"
 * on the `$ref`. So the compact form is INLINED, with no `$ref` and no
 * descriptions (the evidence contract prompt already explains the fields).
 *
 * VALIDATION still uses the full schema, so the visual tier stays legal
 * for Task 4.3b — only the prompt's copy is compacted.
 */
const COMPACT_EVIDENCE: SchemaFragment = {
  type: "object",
  required: ["kind", "timestamp_start", "timestamp_end", "transcript_quote"],
  properties: {
    kind: { const: "transcript" },
    timestamp_start: { type: "integer" },
    timestamp_end: { type: "integer" },
    transcript_quote: { type: "string" },
  },
}

export function compactSchemaForPrompt(schema: SchemaFragment): SchemaFragment {
  const fragment = JSON.stringify(EVIDENCE_SCHEMA)

  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk)
    if (typeof node !== "object" || node === null) return node
    if (JSON.stringify(node) === fragment) return COMPACT_EVIDENCE
    return Object.fromEntries(
      Object.entries(node as Record<string, unknown>).map(([key, value]) => [
        key,
        walk(value),
      ]),
    )
  }

  return walk(schema) as SchemaFragment
}

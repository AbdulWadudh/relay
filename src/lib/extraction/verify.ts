import { normalise } from "@/lib/extraction/normalise"
import type { TranscriptSegment } from "@/lib/transcription"

/**
 * Grounding check (PRD §4.3, §6, Task 4.5).
 *
 * The model no longer cites quotes — that contract made the schema too
 * complex for Groq (human decision 2026-09-01). Instead Relay checks the
 * model's own words against the transcript and the caption itself.
 *
 * This measures OVERLAP, not quotation. The agent is explicitly asked to
 * fix grammar and write complete sentences, so "Blend the peppers,
 * tomatoes and onions into a smooth puree." is a correct rendering of
 * "just blend everything up nicely" and must not be called ungrounded.
 * What it catches is the failure that matters: a claim whose substance
 * has no basis in the source at all.
 */

/**
 * Words carrying no evidential weight. A claim built only from these is
 * unverifiable either way, so they are excluded before scoring rather
 * than allowed to inflate a fabricated line's score.
 */
const STOPWORDS = new Set(
  "a an the and or but if then than that this these those is are was were be been being do does did done to of in on at by for with from into over under out up down off as it its it's you your we our they them he she his her not no so just very really some any all more most other such only own same too can will would should could may might must i me my mine".split(
    /\s+/,
  ),
)

/** Numbers and units are the details a fabrication invents; keep them. */
function contentWords(value: string): string[] {
  return normalise(value)
    .split(" ")
    .filter((word) => word.length > 1 && !STOPWORDS.has(word))
}

/**
 * The share of a claim's content words present in the source.
 *
 * 0.5 is the bar, chosen because the model REWRITES: it drops filler,
 * fixes grammar and merges clauses, so a faithful sentence routinely
 * shares only half its content words with the spoken original. A
 * fabricated claim scores far below that — a step invented wholesale
 * shares almost nothing but incidental words. The threshold is a floor
 * against invention, not a test of quotation.
 */
const GROUNDED = 0.5

/**
 * Below this, overlap is not a meaningful measurement — one missing word
 * out of two swings the score by half — so short values are held to a
 * STRICTER rule instead: every content word must appear in the source.
 *
 * This is where the check earns its keep. "West African" scored exactly
 * 0.50 on a real run because the source only ever says "jollof"; the model
 * supplied "African" from world knowledge. True, but not something the
 * video said, and PRD §6 is about what the source supports.
 */
const SHORT_VALUE_WORDS = 4

/** One content word cannot be judged either way. */
const MIN_WORDS = 2

export type VerificationStatus = "verified" | "unverified" | "unscored"

export type VerificationReason =
  | "NOT_IN_SOURCE"
  | "PARTIALLY_GROUNDED"
  | "TOO_SHORT_TO_SCORE"

export interface Finding {
  /** JSON Pointer to the value, e.g. `/steps/2/instruction`. */
  pointer: string
  status: VerificationStatus
  reason?: VerificationReason
  /** The claim as the model wrote it. */
  value: string
  /** Share of its content words found in the source, 0–1. */
  overlap: number
  /** How many content words were weighed, so `missing` has a denominator. */
  checked: number
  /**
   * The content words absent from the source, which is the EVIDENCE for
   * the flag. Without them the reason is an assertion a reader cannot
   * check — and it is often checkable: matching is exact after
   * normalisation, with no stemming, so a caption saying "articulate"
   * does not satisfy a claim saying "articulation". Seeing the word tells
   * a reader that instantly; being told "not supported" does not.
   */
  missing: string[]
}

export interface VerificationSummary {
  extracted: number
  verified: number
  flagged: number
  findings: Finding[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** RFC 6901 escaping, so a key containing `/` cannot forge a pointer. */
function pointerSegment(key: string | number): string {
  return String(key).replace(/~/g, "~0").replace(/\//g, "~1")
}

function score(value: string, sourceWords: Set<string>): Finding["overlap"] {
  const words = contentWords(value)
  if (words.length === 0) return 0
  const hits = words.filter((word) => sourceWords.has(word)).length
  return hits / words.length
}

function check(
  pointer: string,
  value: string,
  sourceWords: Set<string>,
): Finding {
  const words = contentWords(value)
  if (words.length < MIN_WORDS) {
    return {
      pointer,
      status: "unscored",
      reason: "TOO_SHORT_TO_SCORE",
      value,
      overlap: 1,
      checked: words.length,
      missing: [],
    }
  }

  const missing = words.filter((word) => !sourceWords.has(word))
  const overlap = Number(score(value, sourceWords).toFixed(2))
  const required = words.length < SHORT_VALUE_WORDS ? 1 : GROUNDED
  if (overlap >= required) {
    return {
      pointer,
      status: "verified",
      value,
      overlap,
      checked: words.length,
      missing,
    }
  }
  return {
    pointer,
    status: "unverified",
    // Distinguishing these matters: PARTIALLY_GROUNDED means the substance
    // is there but the model went further than the source; NOT_IN_SOURCE
    // means it invented the claim.
    reason: overlap >= 0.25 ? "PARTIALLY_GROUNDED" : "NOT_IN_SOURCE",
    value,
    overlap,
    checked: words.length,
    missing,
  }
}

function walk(
  node: unknown,
  pointer: string,
  sourceWords: Set<string>,
  findings: Finding[],
): void {
  if (typeof node === "string") {
    findings.push(check(pointer, node, sourceWords))
    return
  }
  if (Array.isArray(node)) {
    node.forEach((entry, index) => {
      walk(entry, `${pointer}/${index}`, sourceWords, findings)
    })
    return
  }
  if (!isRecord(node)) return
  for (const [key, child] of Object.entries(node)) {
    walk(child, `${pointer}/${pointerSegment(key)}`, sourceWords, findings)
  }
}

/**
 * Walks the whole extraction rather than a known shape: the schema comes
 * from whichever agent ran, so every string value is checked.
 *
 * The caption counts as source. It routinely carries the dish name, the
 * nutrition and the cuisine that the speaker never says aloud, and the
 * agent is explicitly told to read it — so scoring those against the
 * transcript alone would flag correct work.
 */
export function verifyExtraction(
  data: Record<string, unknown>,
  segments: TranscriptSegment[],
  description?: string | null,
): VerificationSummary {
  const source = [
    ...segments.map((segment) => segment.text),
    description ?? "",
  ].join(" ")
  const sourceWords = new Set(contentWords(source))

  const findings: Finding[] = []
  walk(data, "", sourceWords, findings)

  const verified = findings.filter((f) => f.status !== "unverified").length
  return {
    extracted: findings.length,
    verified,
    flagged: findings.length - verified,
    findings,
  }
}

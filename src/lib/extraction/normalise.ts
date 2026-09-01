import type { TranscriptSegment } from "@/lib/transcription"

/**
 * Text normalisation for evidence matching (Task 4.5).
 *
 * A model copying a quote "verbatim" still changes it: curly quotes become
 * straight, a trailing full stop is dropped, "2-3" becomes "2–3", casing
 * shifts. Comparing raw strings would fail all of those and reject
 * genuinely grounded claims, so both sides are normalised to a canonical
 * form before they are compared.
 *
 * The normalisation is deliberately LOSSY IN FORM ONLY — it never removes
 * a word. Two different sentences cannot normalise to the same string, so
 * matching after normalisation is still evidence of a verbatim quote and
 * not of a paraphrase.
 */

/** Position map from the normalised transcript back to its segments. */
export interface NormalisedTranscript {
  /** All segments' text, normalised and joined by single spaces. */
  text: string
  /** For each segment, its [start, end) offset within `text`. */
  spans: {
    startOffset: number
    endOffset: number
    segment: TranscriptSegment
  }[]
}

export function normalise(input: string): string {
  return (
    input
      // Compatibility decomposition folds ligatures and full-width forms.
      .normalize("NFKD")
      // Strip combining marks left behind by the decomposition.
      .replace(/\p{M}+/gu, "")
      .toLowerCase()
      // Every dash-like and quote-like character to one representative, so
      // "2–3" and "2-3", "don't" and "don’t" compare equal.
      .replace(/[‐-―−]/g, "-")
      // A dash is only content INSIDE a word ("2-3", "half-inch"); between
      // spaces it is punctuation and has to go, or an em-dash would fail
      // to match the comma the transcript used in the same place.
      .replace(/(?<![\p{L}\p{N}])-+|-+(?![\p{L}\p{N}])/gu, " ")
      .replace(/[‘’‛′]/g, "'")
      .replace(/[“”‟″]/g, '"')
      // Punctuation is formatting, not content. Removed rather than
      // spaced, so "half-inch" stays one token.
      .replace(/[.,;:!?()[\]{}"'`]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  )
}

/**
 * Builds the searchable transcript and the offset table that maps a match
 * back to the segments it came from — which is what lets the timestamp
 * check compare a cited range against the range the words were spoken in.
 */
export function normaliseTranscript(
  segments: TranscriptSegment[],
): NormalisedTranscript {
  const spans: NormalisedTranscript["spans"] = []
  let text = ""

  for (const segment of segments) {
    const piece = normalise(segment.text)
    if (piece.length === 0) continue
    if (text.length > 0) text += " "
    const startOffset = text.length
    text += piece
    spans.push({ startOffset, endOffset: text.length, segment })
  }

  return { text, spans }
}

/** Every segment overlapping a [start, end) offset range in the text. */
export function segmentsForRange(
  transcript: NormalisedTranscript,
  startOffset: number,
  endOffset: number,
): TranscriptSegment[] {
  return transcript.spans
    .filter(
      (span) => span.startOffset < endOffset && span.endOffset > startOffset,
    )
    .map((span) => span.segment)
}

/**
 * Token-level containment: the share of the quote's words that appear, in
 * order, somewhere in the transcript.
 *
 * Only consulted when an exact normalised substring match fails, and only
 * to DISTINGUISH a near-miss from a fabrication in the recorded reason —
 * it never promotes a claim to verified on its own.
 */
export function tokenOverlap(quote: string, haystack: string): number {
  const words = quote.split(" ").filter(Boolean)
  if (words.length === 0) return 0
  const pool = haystack.split(" ").filter(Boolean)
  let cursor = 0
  let matched = 0
  for (const word of words) {
    const found = pool.indexOf(word, cursor)
    if (found === -1) continue
    matched++
    cursor = found + 1
  }
  return matched / words.length
}

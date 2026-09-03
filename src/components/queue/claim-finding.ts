/**
 * How a grounding finding is joined to the claim it belongs to, and how
 * its reason reads to a person.
 */

export interface ClaimFinding {
  pointer: string
  status: string
  reason?: string
  overlap?: number
  /** Content words weighed, the denominator for `missing`. */
  checked?: number
  /** The words absent from the source — the evidence for the flag. */
  missing?: string[]
}

/** How many missing words to name before the list stops being readable. */
const MAX_NAMED = 6

/**
 * The flag's working, shown rather than asserted: how much of the claim
 * was found, and which words were not.
 *
 * Matching is exact after normalisation with NO stemming, so a caption
 * saying "articulate" does not satisfy a claim saying "articulation".
 * Naming the word makes that visible in a second; "not supported by the
 * transcript" leaves a reader with nothing to check.
 */
export function findingEvidence(finding: ClaimFinding): string | null {
  const { checked, missing } = finding
  if (!checked || !missing || missing.length === 0) return null

  const found = checked - missing.length
  const named = missing.slice(0, MAX_NAMED).join(", ")
  const rest = missing.length - MAX_NAMED
  return `${found} of ${checked} words in the source · missing: ${named}${
    rest > 0 ? ` +${rest} more` : ""
  }`
}

export const REASON_TEXT: Record<string, string> = {
  NOT_IN_SOURCE: "Not supported by the transcript or the caption",
  PARTIALLY_GROUNDED: "Goes further than the transcript supports",
  TOO_SHORT_TO_SCORE: "Too short to check",
}

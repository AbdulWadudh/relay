/**
 * How a grounding finding is joined to the claim it belongs to, and how
 * its reason reads to a person.
 */

export interface ClaimFinding {
  pointer: string
  status: string
  reason?: string
  overlap?: number
}

export const REASON_TEXT: Record<string, string> = {
  NOT_IN_SOURCE: "Not supported by the transcript or the caption",
  PARTIALLY_GROUNDED: "Goes further than the transcript supports",
  TOO_SHORT_TO_SCORE: "Too short to check",
}

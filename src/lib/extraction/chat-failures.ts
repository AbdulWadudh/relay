import type { ChatProvider } from "@/lib/extraction/providers"
import { LlmError } from "@/lib/llm/client"

/**
 * How a failed chat call is classified (measurements in LLM_STATE.md).
 *
 * Split from chat.ts to keep that file under the 250-line cap (RULES.md).
 */

/**
 * Longest we will sit on a rate limit before giving up. Groq's free tier
 * is 8000 tokens/minute and a transcript goes over the wire twice per run,
 * so back-to-back runs hit 429 routinely — the provider replies with
 * exactly how long to wait, and waiting beats failing a healthy run.
 */
const MAX_RETRY_AFTER_MS = 30_000
const DEFAULT_RETRY_AFTER_MS = 7_000

/** How far down a provider's ranked catalog to walk before moving on. */
export const MAX_CANDIDATES = 4

/** A candidate that was tried and passed over, recorded on the run. */
export interface SkippedModel {
  provider: string
  model: string
  status: number
  reason: string
}

/** Providers state the wait in the message body: "try again in 5.835s". */
export function retryAfterMs(message: string): number {
  const match = message.match(/try again in ([\d.]+)\s*s/i)
  const seconds = match ? Number(match[1]) : Number.NaN
  if (!Number.isFinite(seconds)) return DEFAULT_RETRY_AFTER_MS
  // A little headroom: the quoted figure is when the window rolls over.
  return Math.min(Math.ceil(seconds * 1000) + 500, MAX_RETRY_AFTER_MS)
}

export type Disposition =
  | "next-model"
  | "next-credential"
  | "next-provider"
  | "fail"

/**
 * A model that is gone, rate-limited, or rejecting the request shape is a
 * reason to try the NEXT MODEL. A rejected or spent key says nothing about
 * the provider's other accounts, so it is a reason to try the NEXT
 * CREDENTIAL. Only a limit the provider itself imposes abandons the whole
 * provider. Anything else is a genuine fault and is rethrown.
 */
export function disposition(
  error: unknown,
  provider: ChatProvider,
): Disposition {
  // A timeout is an AbortError, not an LlmError — the model never
  // answered, so the next candidate gets a turn.
  if (error instanceof Error && error.name === "TimeoutError") {
    return "next-model"
  }
  if (error instanceof Error && error.name === "AbortError") return "next-model"
  if (!(error instanceof LlmError)) return "fail"
  // HTTP succeeded but the model produced nothing usable — an empty
  // completion is a MODEL problem, not a transport one. Measured: a free
  // OpenRouter model returned an empty 200 on a 90-second transcript and
  // killed the run outright, because a 2xx fell through to "fail".
  if (error.status < 400) return "next-model"
  // The key is dead, revoked, or expired. Another account for the same
  // provider is exactly the fallback the user stored it to be.
  if (error.status === 401 || error.status === 403) return "next-credential"
  if (error.status === 400 || error.status === 404) return "next-model"
  if (error.status === 429) return "next-model"
  // 402 — meaning depends on how the provider bills. OpenRouter's is
  // account-wide "insufficient credits", which another account may still
  // have. Ollama Cloud gates PER MODEL and leaves the free ones usable, so
  // there it is just the next candidate's turn.
  if (error.status === 402) {
    return provider.billing === "per-model" ? "next-model" : "next-credential"
  }
  // 413 — the request exceeds THIS provider's size limit, which its other
  // models and its other accounts share.
  if (error.status === 413) return "next-provider"
  // 5xx — the model is overloaded or broken on the provider's side, which
  // says nothing about our request or the other candidates. This fell
  // through to "fail", so ONE transient 503 killed a run with three usable
  // models queued behind it. Measured 2026-09-02: Gemini returned 503 for
  // its top candidate while the others answered fine. Not "next-provider"
  // — a busy model is not a busy provider, and if every model 503s the
  // pass moves on by itself.
  if (error.status >= 500) return "next-model"
  return "fail"
}

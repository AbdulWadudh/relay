import { catalogFor } from "@/lib/extraction/catalog"
import { rankModels } from "@/lib/extraction/models"
import {
  type ChatTask,
  chatProvider,
  chatProviderIds,
} from "@/lib/extraction/providers"
import { chatCompletion, LlmError } from "@/lib/llm/client"
import { logger } from "@/lib/observability/logger"
import { getAccessToken } from "@/lib/vault"

/**
 * Runs one chat call for the extraction stage, over whichever provider the
 * user has a key for (Task 4.4).
 *
 * Wraps the shared client in src/lib/llm/client.ts — there is exactly one
 * HTTP client in this codebase — and adds the two things extraction needs
 * that transcription did not: provider resolution against the vault, and
 * MODEL FALL-THROUGH. Free model catalogs churn constantly, so a withdrawn
 * model must degrade to the next candidate instead of failing the run.
 *
 * The decrypted key is held only for the duration of the call and is never
 * logged, stored, or included in a thrown message (PRD §6).
 */

export class NoExtractionKeyError extends Error {
  readonly code = "NO_EXTRACTION_KEY"

  constructor() {
    super(
      "No extraction provider key found. Add an OpenRouter, Groq, or OpenAI API key in your vault.",
    )
    this.name = "NoExtractionKeyError"
  }
}

/**
 * Longest we will sit on a rate limit before giving up. Groq's free tier
 * is 8000 tokens/minute and a transcript goes over the wire twice per run
 * (routing, then extraction), so back-to-back runs hit 429 routinely — the
 * provider replies with exactly how long to wait, and waiting is far
 * better than failing a run that is otherwise fine.
 */
const MAX_RETRY_AFTER_MS = 30_000
const DEFAULT_RETRY_AFTER_MS = 7_000

/**
 * How far down a provider's ranked catalog to walk before moving on.
 * OpenRouter can return dozens of eligible free models; trying every one
 * of them would turn a bad afternoon on their side into a run that hangs
 * for minutes instead of failing over to the next provider.
 */
const MAX_CANDIDATES = 4

/** A candidate that was tried and passed over, recorded on the run. */
export interface SkippedModel {
  provider: string
  model: string
  status: number
  reason: string
}

/** Providers state the wait in the message body: "try again in 5.835s". */
function retryAfterMs(message: string): number {
  const match = message.match(/try again in ([\d.]+)\s*s/i)
  const seconds = match ? Number(match[1]) : Number.NaN
  if (!Number.isFinite(seconds)) return DEFAULT_RETRY_AFTER_MS
  // A little headroom: the quoted figure is when the window rolls over.
  return Math.min(Math.ceil(seconds * 1000) + 500, MAX_RETRY_AFTER_MS)
}

export interface ChatRun {
  provider: string
  model: string
  content: string
  skipped: SkippedModel[]
}

/**
 * A model that is gone, rate-limited, or rejecting the request shape is a
 * reason to try the NEXT model. A rejected key is a reason to abandon the
 * whole provider. Anything else is a genuine fault and is rethrown.
 */
function disposition(error: unknown): "next-model" | "next-provider" | "fail" {
  // A timeout is an AbortError, not an LlmError — the model never
  // answered, so the next candidate gets a turn.
  if (error instanceof Error && error.name === "TimeoutError") {
    return "next-model"
  }
  if (error instanceof Error && error.name === "AbortError") return "next-model"
  if (!(error instanceof LlmError)) return "fail"
  // HTTP succeeded but the model produced nothing usable — an empty
  // completion is a MODEL problem, not a transport one, so the next
  // candidate gets a turn. Measured: a free OpenRouter model returned an
  // empty 200 on a 90-second transcript and killed the run outright,
  // because a 2xx fell through to "fail".
  if (error.status < 400) return "next-model"
  if (error.status === 401 || error.status === 403) return "next-provider"
  if (error.status === 400 || error.status === 404) return "next-model"
  if (error.status === 429) return "next-model"
  // 402 — OpenRouter's "insufficient credits", which every free model on
  // that account will also return. 413 — the request exceeds THIS
  // provider's size limit, which its other models share.
  if (error.status === 402 || error.status === 413) return "next-provider"
  return "fail"
}

interface PassResult {
  run: ChatRun | null
  sawKey: boolean
  rateLimitedFor: number
  lastError: unknown
}

/** One sweep across every configured provider and each of its models. */
async function attemptPass(options: {
  userId: string
  task: ChatTask
  system: string
  user: string
  signal?: AbortSignal
  jsonSchema?: Record<string, unknown>
  skipped: SkippedModel[]
}): Promise<PassResult> {
  const { userId, task, system, user, signal, jsonSchema, skipped } = options
  let sawKey = false
  let rateLimitedFor = 0
  let lastError: unknown = null

  for (const id of chatProviderIds()) {
    const apiKey = await getAccessToken(id, userId)
    if (!apiKey) continue
    const provider = chatProvider(id)
    if (!provider) continue
    sawKey = true

    // Discovered from the provider's own catalog and ranked by advertised
    // capability — no model id is written down anywhere in this codebase.
    const catalog = await catalogFor({ userId, provider, apiKey })
    const ranked = rankModels(catalog.models, provider, task)
    if (ranked.length === 0) {
      skipped.push({
        provider: provider.id,
        model: "(none)",
        status: 0,
        reason: catalog.stale
          ? "Model catalog unavailable and no cached snapshot"
          : "No model in this provider's catalog met the requirements",
      })
      continue
    }

    for (const candidate of ranked.slice(0, MAX_CANDIDATES)) {
      const model = candidate.id
      try {
        const content = await chatCompletion({
          baseUrl: provider.baseUrl,
          apiKey,
          model,
          system,
          user,
          json: true,
          // Schema-constrained decoding only where the provider says the
          // model supports it; everything else falls back to JSON mode.
          ...(jsonSchema && candidate.structured
            ? { jsonSchema: { name: "extraction", schema: jsonSchema } }
            : {}),
          signal,
        })
        return {
          run: { provider: provider.id, model, content, skipped },
          sawKey,
          rateLimitedFor,
          lastError,
        }
      } catch (error) {
        lastError = error
        const status = error instanceof LlmError ? error.status : 0
        const reason = error instanceof Error ? error.message : String(error)
        const next = disposition(error)
        if (next === "fail") throw error
        if (status === 429) {
          rateLimitedFor = Math.max(rateLimitedFor, retryAfterMs(reason))
        }
        skipped.push({ provider: provider.id, model, status, reason })
        if (next === "next-provider") break
      }
    }
  }

  return { run: null, sawKey, rateLimitedFor, lastError }
}

export async function runChat(options: {
  userId: string
  task: ChatTask
  system: string
  user: string
  /** Passed to models advertising structured outputs. */
  jsonSchema?: Record<string, unknown>
  signal?: AbortSignal
}): Promise<ChatRun> {
  const skipped: SkippedModel[] = []
  const first = await attemptPass({ ...options, skipped })
  if (first.run) return first.run
  if (!first.sawKey) throw new NoExtractionKeyError()

  // Every candidate was exhausted. If the reason was a rate limit rather
  // than a dead model, the window reopens on its own — wait it out once.
  // Failing here would mean two runs submitted together kill each other.
  if (first.rateLimitedFor > 0) {
    logger.warn("Extraction rate limited — waiting for the window to reopen", {
      task: options.task,
      wait_ms: first.rateLimitedFor,
      candidates_tried: skipped.length,
    })
    await Bun.sleep(first.rateLimitedFor)
    const second = await attemptPass({ ...options, skipped })
    if (second.run) return second.run
    throw second.lastError ?? first.lastError ?? new NoExtractionKeyError()
  }

  throw first.lastError ?? new NoExtractionKeyError()
}

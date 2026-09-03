import config from "@/config"
import { resolveChain } from "@/lib/extraction/chain"
import {
  type AttemptOptions,
  attemptKey,
  type ChatRun,
} from "@/lib/extraction/chat-attempt"
import type { SkippedModel } from "@/lib/extraction/chat-failures"
import { type ChatTask, chatProvider } from "@/lib/extraction/providers"
import { logger } from "@/lib/observability/logger"
import { accessTokenById } from "@/lib/vault-select"

/**
 * Runs one chat call for the extraction stage, over whichever provider the
 * user has a key for (Task 4.4).
 *
 * Wraps the shared client in src/lib/llm/client.ts — there is exactly one
 * HTTP client in this codebase — and adds two things transcription did not
 * need: MODEL fall-through within an account, and the ACCOUNT chain itself
 * (src/lib/extraction/chain.ts). Free catalogs churn constantly and free
 * tiers rate-limit per account, so both a withdrawn model and a spent key
 * must degrade to the next candidate instead of failing the run.
 *
 * Decrypted keys are held only for the duration of the pass and are never
 * logged, stored, or included in a thrown message (PRD §6).
 */

export type { ChatRun } from "@/lib/extraction/chat-attempt"
export type { SkippedModel } from "@/lib/extraction/chat-failures"

export class NoExtractionKeyError extends Error {
  readonly code = "NO_EXTRACTION_KEY"

  constructor() {
    super(
      "No extraction provider key found. Add an OpenRouter, Groq, or OpenAI API key in your vault.",
    )
    this.name = "NoExtractionKeyError"
  }
}

interface PassResult {
  run: ChatRun | null
  sawKey: boolean
  rateLimitedFor: number
  lastError: unknown
}

/** One sweep over the whole chain: every account, and each one's models. */
async function attemptPass(options: AttemptOptions): Promise<PassResult> {
  const { userId } = options
  let sawKey = false
  let rateLimitedFor = 0
  let lastError: unknown = null

  // A flat list of ACCOUNTS the user ordered themselves, so two keys for
  // one provider can sit either side of another provider's (chain.ts).
  const chain = await resolveChain(userId)
  // A provider-level refusal (413) rules out its other accounts too, and
  // the chain can revisit that provider later on.
  const abandoned = new Set<string>()

  for (const entry of chain) {
    // Switched off in the vault. It keeps its place in the chain so
    // Settings can show where it sits, but nothing reaches for it.
    if (!entry.active) continue
    if (abandoned.has(entry.provider)) continue
    const provider = chatProvider(entry.provider)
    if (!provider) continue

    // A keyless provider (local Ollama) has no credential to look up. It
    // still needs a non-empty bearer because Ollama's OpenAI-compat layer
    // requires the header and ignores its value.
    const apiKey = entry.credentialId
      ? await accessTokenById(entry.credentialId, userId)
      : config.ollama.localApiKey
    if (!apiKey) continue
    // Counts as "the user can run extraction": a keyless provider is
    // reachable without them configuring anything, so a missing-key error
    // would be wrong.
    sawKey = true

    const attempt = await attemptKey({ ...options, provider, apiKey })
    rateLimitedFor = Math.max(rateLimitedFor, attempt.rateLimitedFor)
    lastError = attempt.lastError ?? lastError
    if (attempt.run) {
      return { run: attempt.run, sawKey, rateLimitedFor, lastError }
    }
    if (attempt.next === "next-provider") abandoned.add(entry.provider)
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
  /** Narrows the chain to image-capable models (src/lib/vision). */
  imageDataUrl?: string
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

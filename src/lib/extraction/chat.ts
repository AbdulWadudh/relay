import config from "@/config"
import { catalogFor } from "@/lib/extraction/catalog"
import {
  disposition,
  MAX_CANDIDATES,
  retryAfterMs,
  type SkippedModel,
} from "@/lib/extraction/chat-failures"
import { rankModels } from "@/lib/extraction/models"
import {
  type ChatProvider,
  type ChatTask,
  chatProvider,
} from "@/lib/extraction/providers"
import { chatCompletion, LlmError } from "@/lib/llm/client"
import { logger } from "@/lib/observability/logger"
import { resolveExtractionOrder } from "@/lib/settings"
import { orderedProviderKeys, type ProviderKey } from "@/lib/vault-select"

/**
 * Runs one chat call for the extraction stage, over whichever provider the
 * user has a key for (Task 4.4).
 *
 * Wraps the shared client in src/lib/llm/client.ts — there is exactly one
 * HTTP client in this codebase — and adds three things transcription did
 * not need: provider resolution against the vault, MODEL fall-through, and
 * CREDENTIAL fall-through. Free catalogs churn constantly and free tiers
 * rate-limit per account, so both a withdrawn model and a spent key must
 * degrade to the next candidate instead of failing the run.
 *
 * Decrypted keys are held only for the duration of the pass and are never
 * logged, stored, or included in a thrown message (PRD §6).
 */

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

export interface ChatRun {
  provider: string
  model: string
  content: string
  skipped: SkippedModel[]
}

interface KeyAttempt {
  run: ChatRun | null
  /** Where to go next when `run` is null. */
  next: "next-credential" | "next-provider"
  rateLimitedFor: number
  lastError: unknown
}

interface AttemptOptions {
  userId: string
  task: ChatTask
  system: string
  user: string
  signal?: AbortSignal
  jsonSchema?: Record<string, unknown>
  skipped: SkippedModel[]
}

/** One provider's ranked catalog, tried with ONE of its keys. */
async function attemptKey(
  options: AttemptOptions & { provider: ChatProvider; apiKey: string },
): Promise<KeyAttempt> {
  const { userId, provider, apiKey, task, system, user, signal, jsonSchema } =
    options
  const { skipped } = options
  let rateLimitedFor = 0
  let lastError: unknown = null

  // Discovered from the provider's own catalog and ranked by advertised
  // capability — no model id is written down anywhere in this codebase.
  let ranked: ReturnType<typeof rankModels>
  try {
    const catalog = await catalogFor({ userId, provider, apiKey })
    ranked = rankModels(catalog.models, provider, task)
  } catch (error) {
    // A catalog read that fails outright, with nothing cached, is THIS
    // key's problem — a revoked key cannot even list models.
    skipped.push({
      provider: provider.id,
      model: "(none)",
      status: error instanceof LlmError ? error.status : 0,
      reason: error instanceof Error ? error.message : String(error),
    })
    return {
      run: null,
      next: "next-credential",
      rateLimitedFor,
      lastError: error,
    }
  }

  if (ranked.length === 0) {
    skipped.push({
      provider: provider.id,
      model: "(none)",
      status: 0,
      reason: "No model in this provider's catalog met the requirements",
    })
    // A catalog is a property of the provider, not of one account.
    return { run: null, next: "next-provider", rateLimitedFor, lastError }
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
        next: "next-credential",
        rateLimitedFor,
        lastError,
      }
    } catch (error) {
      lastError = error
      const status = error instanceof LlmError ? error.status : 0
      const reason = error instanceof Error ? error.message : String(error)
      const next = disposition(error, provider)
      if (next === "fail") throw error
      if (status === 429) {
        rateLimitedFor = Math.max(rateLimitedFor, retryAfterMs(reason))
      }
      skipped.push({ provider: provider.id, model, status, reason })
      if (next !== "next-model") {
        return { run: null, next, rateLimitedFor, lastError }
      }
    }
  }

  // Every model exhausted. A rate limit or a spent quota is per-ACCOUNT, so
  // the provider's next key gets a turn before the provider is given up.
  return { run: null, next: "next-credential", rateLimitedFor, lastError }
}

interface PassResult {
  run: ChatRun | null
  sawKey: boolean
  rateLimitedFor: number
  lastError: unknown
}

/** One sweep over every provider, its keys, and each key's models. */
async function attemptPass(options: AttemptOptions): Promise<PassResult> {
  const { userId } = options
  let sawKey = false
  let rateLimitedFor = 0
  let lastError: unknown = null

  // The user's own preference order (Settings → Extraction), reconciled
  // against the code's list and falling back to it. Unregistered ids are
  // skipped below, so a provider that is off in this deploy costs nothing.
  for (const id of await resolveExtractionOrder(userId)) {
    const provider = chatProvider(id)
    if (!provider) continue
    // A keyless provider (local Ollama) has no credential to look up. It
    // still needs a non-empty bearer because Ollama's OpenAI-compat layer
    // requires the header and ignores its value.
    const keys: ProviderKey[] = provider.keyless
      ? [{ credentialId: provider.id, apiKey: config.ollama.localApiKey }]
      : await orderedProviderKeys(id, userId)
    if (keys.length === 0) continue
    // Counts as "the user can run extraction": a keyless provider is
    // reachable without them configuring anything, so a missing-key error
    // would be wrong.
    sawKey = true

    // The account they marked first, then the rest as fallbacks.
    for (const [index, key] of keys.entries()) {
      if (index > 0) {
        logger.info("Trying the next account for this provider", {
          provider: provider.id,
          task: options.task,
          account: index + 1,
          of: keys.length,
        })
      }
      const attempt = await attemptKey({
        ...options,
        provider,
        apiKey: key.apiKey,
      })
      rateLimitedFor = Math.max(rateLimitedFor, attempt.rateLimitedFor)
      lastError = attempt.lastError ?? lastError
      if (attempt.run) {
        return { run: attempt.run, sawKey, rateLimitedFor, lastError }
      }
      if (attempt.next === "next-provider") break
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

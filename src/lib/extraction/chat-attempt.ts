import { catalogFor } from "@/lib/extraction/catalog"
import {
  disposition,
  MAX_CANDIDATES,
  retryAfterMs,
  type SkippedModel,
} from "@/lib/extraction/chat-failures"
import { rankModels } from "@/lib/extraction/models"
import type { ChatProvider, ChatTask } from "@/lib/extraction/providers"
import { chatCompletion, LlmError } from "@/lib/llm/client"

/**
 * ONE account's turn: that provider's ranked catalog, walked model by
 * model with a single key.
 *
 * Split from chat.ts for the 250-line cap (RULES.md). chat.ts owns the
 * CHAIN — which accounts, in what order, and when to give up on a
 * provider. This owns one account's attempt and the disposition of its
 * failures.
 */

export interface ChatRun {
  provider: string
  model: string
  content: string
  skipped: SkippedModel[]
}

export interface KeyAttempt {
  run: ChatRun | null
  /** Where to go next when `run` is null. */
  next: "next-credential" | "next-provider"
  rateLimitedFor: number
  lastError: unknown
}

export interface AttemptOptions {
  userId: string
  task: ChatTask
  system: string
  user: string
  signal?: AbortSignal
  jsonSchema?: Record<string, unknown>
  /**
   * A contact sheet to read (src/lib/media/frames.ts). Present means the
   * chain is narrowed to models advertising image input — a text-only
   * model handed an image either errors or answers confidently about
   * something it never received.
   */
  imageDataUrl?: string
  skipped: SkippedModel[]
}

/** One provider's ranked catalog, tried with ONE of its keys. */
export async function attemptKey(
  options: AttemptOptions & { provider: ChatProvider; apiKey: string },
): Promise<KeyAttempt> {
  const {
    userId,
    provider,
    apiKey,
    task,
    system,
    user,
    signal,
    jsonSchema,
    imageDataUrl,
  } = options
  const { skipped } = options
  let rateLimitedFor = 0
  let lastError: unknown = null

  // Discovered from the provider's own catalog and ranked by advertised
  // capability — no model id is written down anywhere in this codebase.
  let ranked: ReturnType<typeof rankModels>
  try {
    const catalog = await catalogFor({ userId, provider, apiKey })
    ranked = rankModels(catalog.models, provider, task, Boolean(imageDataUrl))
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
      reason: imageDataUrl
        ? "No model in this provider's catalog accepts images"
        : "No model in this provider's catalog met the requirements",
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
        ...(imageDataUrl ? { imageDataUrl } : {}),
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

import config from "@/config"
import type { AiKeyProviderId } from "@/lib/providers"

/**
 * Chat/extraction provider registry. MODEL IDS ARE NEVER WRITTEN HERE
 * (human decision 2026-09-01) — a provider declares how to DISCOVER its
 * models and which are eligible; catalog.ts fetches and ranks them.
 *
 * Separate from the transcription registry, which is scoped to endpoints
 * that can serve Whisper.
 */

export type ChatTask = "extraction" | "synthesis"

export interface ChatProvider {
  id: AiKeyProviderId
  baseUrl: string
  modelsPath: string
  freeOnly: boolean
  minContext: number
  /**
   * No credential is fetched for this provider and no vault lookup runs.
   * Only local Ollama, which listens on the operator's own machine.
   */
  keyless?: boolean
  /**
   * Capabilities for providers whose /models endpoint advertises NONE.
   * Ollama returns only `{id, object, created, owned_by}`.
   *
   * Such models are still ELIGIBLE — `rankModels` waives its checks when
   * nothing in a catalog publishes capabilities. The problem is quieter:
   * `structured` would be false for every model, so chat.ts would never
   * send `response_format: json_schema` and would silently fall back to
   * loose JSON mode — losing schema-constrained decoding that Ollama
   * actually implements. `contextLength` of 0 also leaves ranking with
   * nothing to sort on but the size parsed out of the model id.
   *
   * These are guarantees of the SERVER, not guesses about a model: Ollama
   * implements `format` (JSON and JSON-schema constrained decoding)
   * uniformly for everything it serves — verified 2026-09-01 against
   * gemma4:12b, which returned schema-valid JSON for a supplied schema.
   */
  capabilities?: { json: boolean; structured: boolean; contextLength: number }
  /**
   * What a 402 means for this provider.
   *
   * "account" (default) — OpenRouter semantics: the ACCOUNT is out of
   * credit, so every other model behind the same key will fail too and the
   * whole provider is abandoned.
   *
   * "per-model" — Ollama Cloud semantics: THIS MODEL needs a paid plan
   * while others on the same key are free. Measured 2026-09-01: the ranker
   * picked `mistral-large-3:675b`, got 402 "this model requires a
   * subscription", and the account-wide reading threw away a provider that
   * had six perfectly usable free models left.
   */
  billing?: "account" | "per-model"
}

/** Shared by both Ollama entries — same server, same guarantees. */
const OLLAMA_CAPABILITIES = {
  json: true,
  structured: true,
  contextLength: config.ollama.contextLength,
}

const providers: Partial<Record<AiKeyProviderId, ChatProvider>> = {
  /**
   * Local Ollama. Registered ONLY when explicitly enabled — being keyless,
   * an always-registered entry would look "configured" in production and
   * burn an attempt per run connecting to nothing (src/config).
   *
   * `freeOnly: false` because a local catalog has no pricing to filter on;
   * every model it lists is already on this machine.
   */
  ...(config.ollama.localEnabled
    ? {
        ollama: {
          id: "ollama" as const,
          baseUrl: config.ollama.localBaseUrl,
          modelsPath: "/models",
          freeOnly: false,
          minContext: 16_384,
          keyless: true,
          capabilities: OLLAMA_CAPABILITIES,
        },
      }
    : {}),
  "ollama-cloud": {
    id: "ollama-cloud",
    baseUrl: config.ollama.cloudBaseUrl,
    modelsPath: "/models",
    // Cloud models are gated by the account's plan, not per-model pricing,
    // and the catalog advertises none — so nothing to filter on.
    freeOnly: false,
    minContext: 16_384,
    capabilities: OLLAMA_CAPABILITIES,
    // Only a handful of cloud models are on the free plan; the rest 402
    // individually. Abandoning the provider on the first one would skip
    // the free models entirely.
    billing: "per-model",
  },
  openrouter: {
    id: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    modelsPath: "/models",
    // OpenRouter fronts hundreds of paid models behind the same key.
    freeOnly: true,
    minContext: 16_384,
  },
  groq: {
    id: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    modelsPath: "/models",
    // Groq's catalog is free-tier under one key; it publishes no pricing.
    freeOnly: false,
    minContext: 16_384,
  },
  gemini: {
    id: "gemini",
    /**
     * Google's OpenAI-COMPATIBLE surface, not the native
     * `generativelanguage` REST API — so it needs no special client.
     * Verified 2026-09-02 against a live key: `GET /models` returns 200
     * with an OpenAI-shaped list, and `POST /chat/completions` with
     * `response_format: json_schema` returns schema-valid JSON.
     */
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelsPath: "/models",
    // The catalog publishes no pricing at all, so there is nothing to
    // filter on; what a key may call is decided by the Google account.
    freeOnly: false,
    minContext: 16_384,
    /**
     * Its rows are `{id, object, owned_by, display_name}` — no context, no
     * feature list, and no `created`. Without a fallback, `structured`
     * would be false for every model and chat.ts would never send
     * `response_format: json_schema`, silently dropping to loose JSON mode
     * on an API that implements schema-constrained decoding properly.
     *
     * `contextLength` is a conservative FLOOR, not a claim about any one
     * model's real window (Gemini's are far larger). It only has to clear
     * `minContext` and give the ranker a value to sort on; ranking caps
     * the signal at SUFFICIENT_CONTEXT anyway.
     */
    capabilities: { json: true, structured: true, contextLength: 32_768 },
  },
  openai: {
    id: "openai",
    baseUrl: "https://api.openai.com/v1",
    modelsPath: "/models",
    freeOnly: false,
    minContext: 16_384,
  },
}

/**
 * Preference order when several keys are configured.
 *
 * GROQ FIRST, on measurement. OpenRouter led initially because its free
 * pool offers far more context, but context is not the constraint — a
 * transcript plus a schema is a few thousand tokens. Latency is: the same
 * extraction took ~5s on Groq and 74s, 88s and 303s on OpenRouter's free
 * models. PRD §6 targets sub-30s for the WHOLE pipeline, and OpenRouter
 * alone blew that by an order of magnitude.
 *
 * OpenRouter stays as the fallback: it carries far more models, so it is
 * what keeps runs working when Groq's 8000 TPM free tier rate-limits.
 *
 * LOCAL OLLAMA LEADS WHEN ENABLED — that is the point of turning it on:
 * keep development off the network and off rate limits. It is absent from
 * the registry otherwise, and `chatProviderIds()` drops unregistered ids,
 * so this ordering costs a production deploy nothing.
 *
 * Ollama Cloud sits after Groq, which is measured at ~5s and free.
 */
export const EXTRACTION_ORDER: readonly AiKeyProviderId[] = [
  "ollama",
  "groq",
  // Behind Groq, which is MEASURED at ~5s. Gemini's flash tier is expected
  // to be quick, but nothing here has timed it, so it does not get to
  // displace the one provider that has been. This is only the DEFAULT — a
  // saved user order wins, and `resolveExtractionOrder` appends newly
  // added providers rather than reshuffling what someone already chose.
  "gemini",
  "ollama-cloud",
  "openrouter",
  "openai",
]

export function chatProvider(id: string): ChatProvider | null {
  return (providers as Record<string, ChatProvider | undefined>)[id] ?? null
}

/** Provider ids that can run extraction, in preference order. */
export function chatProviderIds(): AiKeyProviderId[] {
  return EXTRACTION_ORDER.filter((id) => providers[id] !== undefined)
}

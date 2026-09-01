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
}

const providers: Partial<Record<AiKeyProviderId, ChatProvider>> = {
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
 */
export const EXTRACTION_ORDER: readonly AiKeyProviderId[] = [
  "groq",
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

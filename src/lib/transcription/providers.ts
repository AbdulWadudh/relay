import type { AiKeyProviderId } from "@/lib/providers"

/**
 * Transcription provider registry (Task 4.3), mirroring the shape of
 * src/server/ray-providers.ts: the catalog of provider *ids* lives in
 * src/lib/providers.ts, and this file maps each one onto the endpoints and
 * models it serves. Pipeline logic never names a provider — it asks
 * `resolveProvider()` for whichever the user has a key for.
 *
 * Both entries speak the OpenAI audio API shape (`/audio/transcriptions`
 * and `/audio/translations` with `response_format=verbose_json`), which is
 * why one client covers both. A provider that doesn't is simply absent
 * here — `Partial<Record<...>>` is the same escape hatch ray-providers.ts
 * uses for catalog entries with no flow yet. Gemini is omitted: its audio
 * API is a different shape, not a Whisper-compatible endpoint.
 */

export interface TranscriptionProvider {
  id: AiKeyProviderId
  /** OpenAI-compatible base, without a trailing slash. */
  baseUrl: string
  /** Whisper-class model for transcription and translation. */
  audioModel: string
  /**
   * Chat model used to transliterate non-Latin transcripts into Roman
   * script (PRD §4.2). Task 4.4 reuses this for agent extraction.
   */
  chatModel: string
}

const providers: Partial<Record<AiKeyProviderId, TranscriptionProvider>> = {
  groq: {
    id: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    // whisper-large-v3, not -turbo: turbo is transcription-only and does
    // not serve /audio/translations, which PRD §4.2's English stream needs.
    audioModel: "whisper-large-v3",
    // Groq's catalog churns — llama-3.3-70b-versatile was configured here
    // and had already been withdrawn ("model does not exist"). Verify
    // against GET /openai/v1/models before changing this.
    chatModel: "openai/gpt-oss-120b",
  },
  openai: {
    id: "openai",
    baseUrl: "https://api.openai.com/v1",
    audioModel: "whisper-1",
    chatModel: "gpt-4o-mini",
  },
}

/**
 * Preference order when a user has several keys configured. Groq first: it
 * serves whisper-large-v3 far faster than OpenAI's whisper-1, which matters
 * against PRD §6's sub-30s end-to-end target.
 */
export const TRANSCRIPTION_ORDER: readonly AiKeyProviderId[] = [
  "groq",
  "openai",
]

export function transcriptionProvider(
  id: string,
): TranscriptionProvider | null {
  return (
    (providers as Record<string, TranscriptionProvider | undefined>)[id] ?? null
  )
}

/** Provider ids that can transcribe, in preference order. */
export function transcriptionProviderIds(): AiKeyProviderId[] {
  return TRANSCRIPTION_ORDER.filter((id) => providers[id] !== undefined)
}

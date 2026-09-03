import { logger } from "@/lib/observability/logger"
import {
  type TranscriptionProvider,
  transcriptionProvider,
  transcriptionProviderIds,
} from "@/lib/transcription/providers"
import {
  runWhisper,
  TranscriptionError,
  type WhisperResult,
} from "@/lib/transcription/whisper"
import { orderedProviderKeys } from "@/lib/vault-select"

/**
 * Picks the account transcription runs on, and moves to the next one when
 * that account cannot serve the request.
 *
 * Split from index.ts to keep it under the 250-line cap (RULES.md). The
 * decrypted key is returned to the caller because the transliteration step
 * needs the same account; it is never logged or persisted.
 */

export class NoTranscriptionKeyError extends Error {
  readonly code = "NO_TRANSCRIPTION_KEY"

  constructor(message: string) {
    super(message)
    this.name = "NoTranscriptionKeyError"
  }
}

/**
 * Only quota- and credential-shaped failures fall through. A 413 is the
 * clip being too large, which every account rejects identically, and a 5xx
 * or a timeout says nothing about the key — re-uploading the audio to work
 * around a transient fault would cost more than it saves.
 */
function shouldTryNextAccount(error: unknown): boolean {
  if (!(error instanceof TranscriptionError)) return false
  return (
    error.status === 401 ||
    error.status === 403 ||
    error.status === 402 ||
    error.status === 429
  )
}

interface Candidate {
  provider: TranscriptionProvider
  apiKey: string
}

/** Every provider that can serve Whisper, and each of its keys, in order. */
async function candidates(userId: string): Promise<Candidate[]> {
  const found: Candidate[] = []
  for (const id of transcriptionProviderIds()) {
    const provider = transcriptionProvider(id)
    if (!provider) continue
    for (const key of await orderedProviderKeys(id, userId)) {
      found.push({ provider, apiKey: key.apiKey })
    }
  }
  return found
}

export interface WhisperPair extends Candidate {
  spoken: WhisperResult
  english: WhisperResult
  whisperMs: number
}

export async function runWhisperPair(options: {
  audioPath: string
  userId: string
  signal?: AbortSignal
}): Promise<WhisperPair> {
  const { audioPath, userId, signal } = options
  const available = await candidates(userId)
  if (available.length === 0) {
    throw new NoTranscriptionKeyError(
      "No transcription provider key found. Add an API key in your vault for a provider that supports Whisper.",
    )
  }

  let lastError: unknown = null
  for (const [index, { provider, apiKey }] of available.entries()) {
    // Both calls read the same file and don't depend on each other, so they
    // run concurrently — this is the slowest stage in the pipeline and
    // PRD §6 targets sub-30s end to end.
    const startedAt = performance.now()
    try {
      const [spoken, english] = await Promise.all([
        runWhisper({
          provider,
          apiKey,
          audioPath,
          task: "transcriptions",
          signal,
        }),
        runWhisper({
          provider,
          apiKey,
          audioPath,
          task: "translations",
          signal,
        }),
      ])
      return {
        provider,
        apiKey,
        spoken,
        english,
        whisperMs: Math.round(performance.now() - startedAt),
      }
    } catch (error) {
      lastError = error
      const isLast = index === available.length - 1
      if (isLast || !shouldTryNextAccount(error)) throw error
      logger.warn("Transcription account unavailable — trying the next one", {
        provider: provider.id,
        status: error instanceof TranscriptionError ? error.status : 0,
        account: index + 1,
        of: available.length,
      })
    }
  }

  throw lastError
}

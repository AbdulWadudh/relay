import { logger } from "@/lib/observability/logger"
import {
  NoTranscriptionKeyError,
  runWhisperPair,
} from "@/lib/transcription/resolve"
import { type RomanStream, toRomanScript } from "@/lib/transcription/roman"
import { hasSpeech, NoSpeechError } from "@/lib/transcription/speech"
import {
  type SpeechConfidence,
  TranscriptionError,
  type TranscriptSegment,
} from "@/lib/transcription/whisper"

/**
 * Transcription engine (PRD §4.2, Task 4.3).
 *
 * Produces BOTH streams the PRD requires: the Roman/phonetic record of
 * what was actually said, and a millisecond-aligned English translation
 * that Task 4.5 verifies evidence quotes against.
 *
 * Provider-generic throughout — the caller never names a provider.
 * Account resolution and fallback live in resolve.ts; the key it returns is
 * held only for the duration of the call and never logged (PRD §6).
 */

export { NoTranscriptionKeyError } from "@/lib/transcription/resolve"
export { NoSpeechError } from "@/lib/transcription/speech"
export type { TranscriptSegment } from "@/lib/transcription/whisper"
export { TranscriptionError } from "@/lib/transcription/whisper"

export interface EnglishStream {
  text: string
  segments: TranscriptSegment[]
}

export interface Transcription {
  /**
   * False when the clip carries no usable speech (music-only Reels are
   * common). Callers must fall back to another source — the frame/vision
   * layer — rather than trusting the text, because Whisper fabricates
   * plausible filler for silent audio.
   */
  hasSpeech: boolean
  /**
   * What Whisper produced when `hasSpeech` is false. Retained only for
   * auditing; it is fabricated and must never reach an agent or a reader.
   */
  discardedText: string | null
  provider: string
  audioModel: string
  language: string | null
  durationSeconds: number | null
  /** What was said, in Latin script (PRD §4.2 raw stream). */
  roman: RomanStream
  /** English translation with millisecond alignments. */
  english: EnglishStream
  /** Whisper's speech confidence, retained on the run for auditing. */
  speech: SpeechConfidence
  timings: {
    transcribeMs: number
    translateMs: number
    transliterateMs: number
  }
}

export async function transcribe(options: {
  audioPath: string
  userId: string
  runId: string
  signal?: AbortSignal
}): Promise<Transcription> {
  const { audioPath, userId, runId, signal } = options
  // Walks the provider's accounts when one is rate-limited or rejected.
  const { provider, apiKey, spoken, english, whisperMs } = await runWhisperPair(
    { audioPath, userId, signal },
  )

  // Gate before anything downstream sees the text. Hallucinated filler is
  // discarded rather than returned, but kept for auditing.
  if (!hasSpeech(spoken.speech)) {
    logger.warn("No speech detected — discarding transcript", {
      run_id: runId,
      provider: provider.id,
      mean_no_speech_prob: Number(spoken.speech.meanNoSpeechProb.toFixed(3)),
      mean_logprob: Number(spoken.speech.meanLogprob.toFixed(3)),
    })
    return {
      hasSpeech: false,
      discardedText: spoken.text,
      provider: provider.id,
      audioModel: provider.audioModel,
      language: spoken.language,
      durationSeconds: spoken.durationSeconds,
      roman: { text: "", segments: [], transliterated: false, latinRatio: 1 },
      english: { text: "", segments: [] },
      speech: spoken.speech,
      timings: {
        transcribeMs: whisperMs,
        translateMs: whisperMs,
        transliterateMs: 0,
      },
    }
  }

  const transliterateStart = performance.now()
  const roman = await toRomanScript({
    provider,
    apiKey,
    text: spoken.text,
    segments: spoken.segments,
    signal,
  })
  const transliterateMs = Math.round(performance.now() - transliterateStart)

  logger.info("Transcription complete", {
    run_id: runId,
    provider: provider.id,
    language: spoken.language,
    duration_seconds: spoken.durationSeconds,
    roman_transliterated: roman.transliterated,
    mean_no_speech_prob: Number(spoken.speech.meanNoSpeechProb.toFixed(3)),
    english_segments: english.segments.length,
    whisper_ms: whisperMs,
    transliterate_ms: transliterateMs,
  })

  return {
    hasSpeech: true,
    discardedText: null,
    provider: provider.id,
    audioModel: provider.audioModel,
    language: spoken.language,
    durationSeconds: spoken.durationSeconds,
    roman,
    english: { text: english.text, segments: english.segments },
    speech: spoken.speech,
    timings: {
      // The two Whisper calls overlap, so the wall-clock figure is
      // recorded against both rather than double-counted.
      transcribeMs: whisperMs,
      translateMs: whisperMs,
      transliterateMs,
    },
  }
}

/** True for failures that will recur identically on retry. */
export function isPermanentTranscriptionError(error: unknown): boolean {
  if (error instanceof NoTranscriptionKeyError) return true
  // The clip will still have no speech on a retry.
  if (error instanceof NoSpeechError) return true
  if (error instanceof TranscriptionError) {
    // 401/403 = bad key, 413 = file too large — retrying changes nothing.
    return error.status === 401 || error.status === 403 || error.status === 413
  }
  return false
}

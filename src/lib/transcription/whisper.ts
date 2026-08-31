import type { TranscriptionProvider } from "@/lib/transcription/providers"

/**
 * Whisper audio endpoints (PRD §4.2). `/audio/transcriptions` returns the
 * audio in its spoken language; `/audio/translations` always returns
 * English. Both take the same multipart body and both return
 * `verbose_json`, so one function covers them.
 *
 * The API key is passed per call and never logged — provider errors are
 * scrubbed of it before they escape.
 */

export type WhisperTask = "transcriptions" | "translations"

export interface TranscriptSegment {
  /** Milliseconds from the start of the audio (PRD §4.2). */
  startMs: number
  endMs: number
  text: string
}

export interface WhisperResult {
  text: string
  segments: TranscriptSegment[]
  /** Detected spoken language, when the provider reports one. */
  language: string | null
  durationSeconds: number | null
  /**
   * Whisper's own confidence that the audio contained speech at all.
   * Music-only clips make it hallucinate plausible filler ("Thank you for
   * watching!"), which for an evidence-grounded product is the single worst
   * thing that can reach the extraction agent — so the caller gates on this.
   */
  speech: SpeechConfidence
}

export interface SpeechConfidence {
  /** Mean `no_speech_prob` across segments. Higher = less likely speech. */
  meanNoSpeechProb: number
  /** Mean `avg_logprob`. Very negative = the model was guessing. */
  meanLogprob: number
  segmentCount: number
}

export class TranscriptionError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "TranscriptionError"
    this.status = status
  }
}

interface VerboseJson {
  text?: string
  language?: string
  duration?: number
  segments?: {
    start?: number
    end?: number
    text?: string
    no_speech_prob?: number
    avg_logprob?: number
  }[]
  error?: { message?: string }
}

function scrub(raw: string, apiKey: string): string {
  const clean = apiKey ? raw.split(apiKey).join("[REDACTED]") : raw
  return clean.slice(0, 400)
}

/** Whisper reports float seconds; PRD asks for millisecond alignment. */
function toSegments(raw: VerboseJson["segments"]): TranscriptSegment[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((segment) => ({
      startMs: Math.round((segment.start ?? 0) * 1000),
      endMs: Math.round((segment.end ?? 0) * 1000),
      text: (segment.text ?? "").trim(),
    }))
    .filter((segment) => segment.text.length > 0)
}

/** Averages Whisper's per-segment confidence fields. */
function toSpeechConfidence(raw: VerboseJson["segments"]): SpeechConfidence {
  const segments = Array.isArray(raw) ? raw : []
  if (segments.length === 0) {
    return { meanNoSpeechProb: 1, meanLogprob: -10, segmentCount: 0 }
  }
  const sum = segments.reduce(
    (acc, segment) => ({
      nsp: acc.nsp + (segment.no_speech_prob ?? 0),
      lp: acc.lp + (segment.avg_logprob ?? 0),
    }),
    { nsp: 0, lp: 0 },
  )
  return {
    meanNoSpeechProb: sum.nsp / segments.length,
    meanLogprob: sum.lp / segments.length,
    segmentCount: segments.length,
  }
}

export async function runWhisper(options: {
  provider: TranscriptionProvider
  apiKey: string
  audioPath: string
  task: WhisperTask
  signal?: AbortSignal
}): Promise<WhisperResult> {
  const { provider, apiKey, audioPath, task, signal } = options

  const form = new FormData()
  // Bun.file is a Blob; the filename matters because the API infers the
  // container format from its extension.
  form.append("file", Bun.file(audioPath), "audio.mp3")
  form.append("model", provider.audioModel)
  form.append("response_format", "verbose_json")
  // NOTE: deliberately no `prompt`. A decoding prompt does not make Whisper
  // emit Latin script for Hindi (measured: still Devanagari), and on
  // low-speech audio Whisper regurgitates the prompt itself into the
  // transcript — a run once returned "The Latin ürlich" straight out of the
  // prompt text. Romanisation is handled downstream in roman.ts instead.

  const response = await fetch(`${provider.baseUrl}/audio/${task}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal,
  })

  const payload = (await response
    .json()
    .catch(() => null)) as VerboseJson | null

  if (!response.ok) {
    throw new TranscriptionError(
      response.status,
      scrub(
        payload?.error?.message ??
          `${provider.id} ${task} failed (${response.status})`,
        apiKey,
      ),
    )
  }

  const text = (payload?.text ?? "").trim()
  if (!text) {
    throw new TranscriptionError(
      response.status,
      "The provider returned an empty transcript — the clip may have no speech.",
    )
  }

  return {
    text,
    segments: toSegments(payload?.segments),
    language: payload?.language ?? null,
    durationSeconds:
      typeof payload?.duration === "number" ? payload.duration : null,
    speech: toSpeechConfidence(payload?.segments),
  }
}

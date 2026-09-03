import { NoFrameTextError } from "@/lib/analysis-errors"
import type { AnalysisMode } from "@/lib/db/schema"
import { type ContactSheet, contactSheetForRun } from "@/lib/media/frames"
import type { IngestedAudio } from "@/lib/media/ingest"
import { logger } from "@/lib/observability/logger"
import { descriptionOf, titleOf } from "@/lib/pipeline-errors"
import {
  NoSpeechError,
  type Transcription,
  type TranscriptSegment,
  transcribe,
} from "@/lib/transcription"
import { readScreenText, type ScreenReading } from "@/lib/vision/screen-text"

/**
 * Turns a downloaded clip into the ONE thing the rest of the pipeline
 * consumes: timestamped segments (Task 4.3b).
 *
 * There are two producers — Whisper, and the frames path reading a contact
 * sheet — and they emit the same `TranscriptSegment[]`. That is what lets
 * agent routing, `extraction/evidence.ts` and `verify.ts` stay untouched:
 * they never learn which producer a segment came from, only when it was on
 * screen or in the audio.
 *
 * `analysis_mode` (src/lib/db/schema.ts) picks the producers, because the
 * submitter knows what they submitted and that is cheaper and more
 * reliable than detecting it:
 *
 *   auto    speech, and frames only if the audio had none
 *   vision   frames alone — no Whisper call is made or paid for
 *   both     speech AND frames, merged by time
 */

export interface Analysis {
  /** Merged and time-ordered; the only field downstream stages read. */
  segments: TranscriptSegment[]
  transcription: Transcription | null
  screen: ScreenReading | null
  sheet: ContactSheet | null
  /** Which producers actually contributed, for the run record. */
  sources: string[]
}

async function readFrames(options: {
  audio: IngestedAudio
  userId: string
  runId: string
  signal?: AbortSignal
}): Promise<{ screen: ScreenReading; sheet: ContactSheet }> {
  const { audio, userId, runId, signal } = options
  const sheet = await contactSheetForRun({
    source: audio.source,
    dir: audio.dir,
    userId,
    runId,
  })
  const screen = await readScreenText({
    userId,
    runId,
    sheet,
    title: titleOf(audio.info),
    description: descriptionOf(audio.info),
    signal,
  })
  return { screen, sheet }
}

export async function analyseMedia(options: {
  mode: AnalysisMode
  audio: IngestedAudio
  userId: string
  runId: string
  signal?: AbortSignal
}): Promise<Analysis> {
  const { mode, audio, userId, runId, signal } = options

  // Frames only. Whisper is not called at all — on a music-only clip its
  // two requests are pure cost, and its output would be discarded anyway.
  if (mode === "vision") {
    const { screen, sheet } = await readFrames({ audio, userId, runId, signal })
    if (screen.segments.length === 0) {
      throw new NoFrameTextError()
    }
    return {
      segments: screen.segments,
      transcription: null,
      screen,
      sheet,
      sources: ["frames"],
    }
  }

  const transcription = await transcribe({
    audioPath: audio.audioPath,
    userId,
    runId,
    signal,
  })
  const spoken = transcription.hasSpeech ? transcription.english.segments : []

  // `auto` stops here when the audio carried speech; `both` always reads
  // the frames too, because a clip can put half its instructions on screen.
  if (mode === "auto" && transcription.hasSpeech) {
    return {
      segments: spoken,
      transcription,
      screen: null,
      sheet: null,
      sources: ["speech"],
    }
  }

  const { screen, sheet } = await readFrames({ audio, userId, runId, signal })

  // Alongside speech, only the frames carrying TEXT are merged in: the
  // audio already says what is happening, so "a man in an orange shirt
  // speaks" would be noise an extraction agent has to wade through.
  const fromFrames = spoken.length > 0 ? screen.textSegments : screen.segments
  const segments = [...spoken, ...fromFrames].sort(
    (a, b) => a.startMs - b.startMs,
  )
  if (segments.length === 0) {
    // Neither producer yielded anything. For a no-speech clip that is the
    // frames path failing too, so the original error is the honest one.
    if (!transcription.hasSpeech) throw new NoSpeechError(transcription.speech)
    throw new NoFrameTextError()
  }

  logger.info("Analysis complete", {
    run_id: runId,
    mode,
    had_speech: transcription.hasSpeech,
    spoken_segments: spoken.length,
    screen_segments: fromFrames.length,
  })

  return {
    segments,
    transcription,
    screen,
    sheet,
    sources: [...(spoken.length > 0 ? ["speech"] : []), "frames"],
  }
}

/**
 * What a run stores about its analysis. Shaped here rather than in
 * pipeline.ts, which owns the ORDER of the stages, not the contents of any
 * one of them — and was over the 250-line cap (RULES.md).
 *
 * Every stream is retained in full: the segments are what Task 4.5 verifies
 * evidence quotes against, and the Roman stream is the record of what was
 * actually said.
 */
export function analysisRecord(
  analysis: Analysis,
  mode: AnalysisMode,
): {
  timings: Record<string, number>
  additionalData: Record<string, unknown>
} {
  const { transcription, screen, sheet } = analysis

  return {
    timings: {
      ...(transcription
        ? {
            transcribe_ms: transcription.timings.transcribeMs,
            transliterate_ms: transcription.timings.transliterateMs,
          }
        : {}),
      ...(sheet
        ? {
            frames_download_ms: sheet.timings.downloadMs,
            frames_render_ms: sheet.timings.renderMs,
          }
        : {}),
    },
    additionalData: {
      analysis: { mode, sources: analysis.sources },
      ...(transcription && !transcription.hasSpeech
        ? {
            no_speech: {
              confidence: transcription.speech,
              discarded_text: transcription.discardedText,
            },
          }
        : {}),
      ...(transcription?.hasSpeech
        ? {
            transcript: {
              provider: transcription.provider,
              audio_model: transcription.audioModel,
              language: transcription.language,
              duration_seconds: transcription.durationSeconds,
              roman: transcription.roman,
              english: transcription.english,
              speech: transcription.speech,
            },
          }
        : {}),
      ...(screen && sheet
        ? {
            screen_text: {
              provider: screen.provider,
              model: screen.model,
              at_seconds: sheet.atSeconds,
              grid: sheet.grid,
              cell_width: sheet.cellWidth,
              sheet_bytes: sheet.bytes,
              segments: screen.segments,
            },
          }
        : {}),
    },
  }
}

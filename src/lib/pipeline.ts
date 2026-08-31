import { UnrecoverableError } from "bullmq"
import type { RunStatus } from "@/lib/db/schema"
import { MediaBinaryError } from "@/lib/media/binaries"
import { MediaIngestError, withIngestedAudio } from "@/lib/media/ingest"
import { logger } from "@/lib/observability/logger"
import { getRunForWorker, updateRun } from "@/lib/runs"
import {
  isPermanentTranscriptionError,
  NoSpeechError,
  NoTranscriptionKeyError,
  TranscriptionError,
  transcribe,
} from "@/lib/transcription"

/**
 * The processing pipeline (TRD §3 `POST /api/v1/relay/process`), executed
 * by the BullMQ worker rather than inside the HTTP request.
 *
 * Stages land task by task. Task 4.2 wires ingest (4.1) and the run's
 * status/timing bookkeeping; transcription (4.3), agent extraction (4.4),
 * evidence verification (4.5) and publishing (4.6) slot into the marked
 * point inside the ingest scope, where the audio file still exists.
 */

/**
 * Failures that will fail identically on every retry — a bad URL doesn't
 * become valid, and a missing binary won't install itself mid-backoff.
 * Throwing UnrecoverableError tells BullMQ to stop rather than burn the
 * attempt budget re-downloading nothing.
 */
function isPermanent(error: unknown): boolean {
  if (error instanceof MediaBinaryError) return true
  if (error instanceof MediaIngestError) {
    return (
      error.code === "SOURCE_UNSUPPORTED" || error.code === "SOURCE_UNAVAILABLE"
    )
  }
  return isPermanentTranscriptionError(error)
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function codeOf(error: unknown): string {
  if (error instanceof MediaBinaryError) return error.code
  if (error instanceof MediaIngestError) return error.code
  if (error instanceof NoTranscriptionKeyError) return error.code
  if (error instanceof NoSpeechError) return error.code
  if (error instanceof TranscriptionError)
    return `TRANSCRIPTION_${error.status}`
  return "UNKNOWN"
}

export async function processRun(runId: string): Promise<void> {
  const run = await getRunForWorker(runId)
  if (!run) {
    // The row was deleted between enqueue and pickup — nothing to do, and
    // retrying can't bring it back.
    logger.warn("Run job skipped: no such run", { run_id: runId })
    throw new UnrecoverableError(`Run ${runId} no longer exists`)
  }

  const startedAt = performance.now()
  // Tracks which stage a failure happened in, so a failed run records where
  // it died rather than just that it did. Later tasks call `enter()` again
  // as they take over.
  let stage: RunStatus = "queued"
  const enter = async (next: RunStatus) => {
    stage = next
    await updateRun(runId, { status: next, error: null })
  }

  try {
    await enter("downloading")

    await withIngestedAudio({ url: run.sourceUrl, runId }, async (audio) => {
      await updateRun(runId, {
        timings: {
          download_ms: audio.timings.downloadMs,
          extract_ms: audio.timings.extractMs,
        },
        additionalData: {
          // Full pruned yt-dlp metadata — the user's requirement that
          // everything a run generates is retained for later analysis.
          source_info: audio.info,
          binaries: audio.binaries,
          audio_bytes: audio.audioBytes,
          duration_seconds: audio.durationSeconds,
        },
      })

      await enter("transcribing")
      const transcription = await transcribe({
        audioPath: audio.audioPath,
        userId: run.userId,
        runId,
      })

      if (!transcription.hasSpeech) {
        // Task 4.3b (frame/vision extraction) takes over here for the many
        // Reels that are music over on-screen text. Until it lands there is
        // no other source, so the run fails rather than publishing
        // fabricated speech.
        await updateRun(runId, {
          additionalData: {
            no_speech: {
              confidence: transcription.speech,
              discarded_text: transcription.discardedText,
            },
          },
        })
        throw new NoSpeechError(transcription.speech)
      }

      await updateRun(runId, {
        timings: {
          transcribe_ms: transcription.timings.transcribeMs,
          transliterate_ms: transcription.timings.transliterateMs,
        },
        additionalData: {
          // Both streams are retained in full — the English segments are
          // what Task 4.5 verifies evidence quotes against, and the Roman
          // stream is the record of what was actually said.
          transcript: {
            provider: transcription.provider,
            audio_model: transcription.audioModel,
            language: transcription.language,
            duration_seconds: transcription.durationSeconds,
            roman: transcription.roman,
            english: transcription.english,
            speech: transcription.speech,
          },
        },
      })

      // ── Tasks 4.4–4.6 run here, while audio.audioPath still exists ──
      // route to agent -> verify evidence -> publish
    })

    await updateRun(runId, {
      status: "done",
      timings: { total_ms: Math.round(performance.now() - startedAt) },
    })
    logger.info("Run completed", { run_id: runId, source: run.source })
  } catch (error) {
    const permanent = isPermanent(error)
    await updateRun(runId, {
      status: "failed",
      error: messageOf(error),
      timings: { total_ms: Math.round(performance.now() - startedAt) },
      additionalData: {
        error_code: codeOf(error),
        failed_stage: stage,
        permanent,
      },
    })
    logger.error("Run failed", {
      run_id: runId,
      stage,
      code: codeOf(error),
      permanent,
      error: messageOf(error),
    })
    // Re-thrown so BullMQ records the failure; Unrecoverable stops retries.
    throw permanent ? new UnrecoverableError(messageOf(error)) : error
  }
}

import { UnrecoverableError } from "bullmq"

import { ExtractionError, NoExtractionKeyError } from "@/lib/extraction"
import { MediaBinaryError } from "@/lib/media/binaries"
import { MediaIngestError } from "@/lib/media/ingest"
import {
  isPermanentPublishError,
  NoNotionRayError,
  NotionGuidesError,
  NotionPublishError,
} from "@/lib/render/notion"
import {
  isPermanentTranscriptionError,
  NoSpeechError,
  NoTranscriptionKeyError,
  TranscriptionError,
} from "@/lib/transcription"

/**
 * Failure classification for the pipeline, split from pipeline.ts to keep
 * both files under the 250-line cap (RULES.md).
 */

export { UnrecoverableError }

/**
 * Failures that will fail identically on every retry — a bad URL doesn't
 * become valid, and a missing binary won't install itself mid-backoff.
 * Throwing UnrecoverableError tells BullMQ to stop rather than burn the
 * attempt budget re-downloading nothing.
 */
export function isPermanent(error: unknown): boolean {
  if (error instanceof MediaBinaryError) return true
  if (error instanceof MediaIngestError) {
    return (
      error.code === "SOURCE_UNSUPPORTED" || error.code === "SOURCE_UNAVAILABLE"
    )
  }
  // A missing key won't appear during a backoff. A model that failed
  // validation twice CAN succeed on a fresh attempt, so that one retries.
  if (error instanceof NoExtractionKeyError) return true
  if (isPermanentPublishError(error)) return true
  return isPermanentTranscriptionError(error)
}

/** yt-dlp's pruned metadata — the title is the only field routing needs. */
export function titleOf(info: Record<string, unknown>): string | null {
  return typeof info.title === "string" && info.title.trim().length > 0
    ? info.title
    : null
}

/** The post's caption/description, which carries context the audio does not. */
export function descriptionOf(info: Record<string, unknown>): string | null {
  const raw = info.description
  return typeof raw === "string" && raw.trim().length > 0 ? raw : null
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function codeOf(error: unknown): string {
  if (error instanceof MediaBinaryError) return error.code
  if (error instanceof MediaIngestError) return error.code
  if (error instanceof NoTranscriptionKeyError) return error.code
  if (error instanceof NoSpeechError) return error.code
  if (error instanceof NoExtractionKeyError) return error.code
  if (error instanceof ExtractionError) return error.code
  if (error instanceof NoNotionRayError) return error.code
  if (error instanceof NotionGuidesError) return error.code
  if (error instanceof NotionPublishError) return error.code
  if (error instanceof TranscriptionError)
    return `TRANSCRIPTION_${error.status}`
  return "UNKNOWN"
}

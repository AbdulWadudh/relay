import { UnrecoverableError } from "bullmq"
import { analyseMedia, analysisRecord } from "@/lib/analysis"
import type { RunStatus } from "@/lib/db/schema"
import { extract } from "@/lib/extraction"
import { verifyExtraction } from "@/lib/extraction/verify"
import { withIngestedAudio } from "@/lib/media/ingest"
import { logger } from "@/lib/observability/logger"
import { setRunStage, withRunContext } from "@/lib/observability/run-context"
import {
  codeOf,
  descriptionOf,
  isPermanent,
  messageOf,
  titleOf,
} from "@/lib/pipeline-errors"
import { publishRun } from "@/lib/render/publish"
import { getRunForWorker, updateRun } from "@/lib/runs"

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
 * Establishes the run's logging context for the WHOLE job, then runs it.
 *
 * Everything below logs inside this scope, so every line — including from
 * code that has no idea a run exists, like src/lib/media/download.ts —
 * carries `run_id` and the current `stage`. That is what the run detail
 * view's per-stage log stream reads, and it is why no logging call in the
 * pipeline had to change to get it.
 */
export async function processRun(runId: string): Promise<void> {
  return await withRunContext(runId, "queued", () => runPipeline(runId))
}

async function runPipeline(runId: string): Promise<void> {
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
    // Advances the AMBIENT stage too, so lines logged from here on group
    // under the right heading in the UI without being passed a stage.
    setRunStage(next)
    await updateRun(runId, { status: next, error: null })
  }

  try {
    await enter("downloading")

    await withIngestedAudio(
      { url: run.sourceUrl, runId, userId: run.userId },
      async (audio) => {
        await updateRun(runId, {
          timings: {
            download_ms: audio.timings.downloadMs,
            // NOT `extract_ms` — that key belongs to the `extracting` stage
            // (agent extraction, Task 4.4). Stage completion is derived from
            // recorded timings, so sharing a key would make ffmpeg's audio
            // extraction light up the agent stage as complete.
            audio_extract_ms: audio.timings.extractMs,
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
        // Whisper, the frames path, or both — decided by the mode the
        // submitter chose (src/lib/analysis.ts). Every branch returns the
        // same timestamped segments, so nothing below this point changes.
        const analysis = await analyseMedia({
          mode: run.analysisMode,
          audio,
          userId: run.userId,
          runId,
        })
        const { transcription, screen } = analysis
        await updateRun(runId, analysisRecord(analysis, run.analysisMode))

        // ── Tasks 4.5–4.6 slot in below, while audio.audioPath exists ──
        await enter("extracting")
        const extraction = await extract({
          userId: run.userId,
          runId,
          requestedAgentId: run.agentId,
          title: titleOf(audio.info),
          description: descriptionOf(audio.info),
          segments: analysis.segments,
        })

        // Every claim is checked against the English transcript before it
        // can reach a destination (PRD §6). Unverifiable claims are FLAGGED
        // rather than dropped (human decision 2026-09-01) — the value stays
        // and the reason is recorded, so nothing is silently discarded.
        const verifyStart = performance.now()
        const verification = verifyExtraction(
          extraction.data,
          analysis.segments,
          descriptionOf(audio.info),
        )
        const verifyMs = Math.round(performance.now() - verifyStart)

        logger.info("Evidence verified", {
          run_id: runId,
          extracted: verification.extracted,
          verified: verification.verified,
          flagged: verification.flagged,
          verify_ms: verifyMs,
        })

        await updateRun(runId, {
          // The agent the router settled on is recorded ON the run, so a run
          // submitted with no agent still shows which one processed it.
          agentId: extraction.routing.agentId,
          result: {
            extraction: extraction.data,
            verification: {
              extracted: verification.extracted,
              verified: verification.verified,
              flagged: verification.flagged,
            },
          },
          timings: {
            route_ms: extraction.timings.routeMs,
            extract_ms: extraction.timings.extractMs,
            verify_ms: verifyMs,
          },
          additionalData: {
            routing: {
              mode: extraction.routing.mode,
              agent_id: extraction.routing.agentId,
              agent_name: extraction.routing.agentName,
              reason: extraction.routing.reason,
              // Absent when no model was consulted (an explicitly requested
              // agent), which the run page renders as "no model needed".
              provider: extraction.routing.provider,
              model: extraction.routing.model,
            },
            extraction: {
              provider: extraction.provider,
              model: extraction.model,
              attempts: extraction.attempts,
              json_repaired: extraction.repaired,
              // Retained even when the retry succeeded: a schema that needs
              // a correction pass every run is a schema worth fixing.
              first_attempt_errors: extraction.firstAttemptErrors,
              skipped_models: extraction.skippedModels,
            },
            // Every finding, verified and flagged alike. A flagged claim
            // without its reason recorded would be a silent failure.
            verification: verification.findings,
          },
        })

        await enter("publishing")
        await publishRun({
          runId,
          userId: run.userId,
          sourceUrl: run.sourceUrl,
          title: titleOf(audio.info),
          extraction: extraction.data,
          agentName: extraction.routing.agentName,
          category: extraction.routing.category,
          emoji: extraction.routing.emoji,
          verification,
          // Only the two streams that exist. Whisper returns native
          // script and `toRomanScript` transliterates in place, so there
          // is no separate original-script text to publish -- `roman` IS
          // the verbatim record, in Latin script.
          // Only the streams this run actually produced: a frames-only run
          // has no spoken transcript to publish, and a speech run has no
          // screen reading.
          transcripts: [
            ...(transcription?.hasSpeech
              ? [
                  {
                    label: "Transcript — original (Roman script)",
                    text: transcription.roman.text,
                  },
                  {
                    label: "Transcript — English translation",
                    text: transcription.english.text,
                  },
                ]
              : []),
            ...(screen ? [{ label: "On-screen text", text: screen.text }] : []),
          ],
        })
      },
    )

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

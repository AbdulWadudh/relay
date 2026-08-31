import { $ } from "bun"

import config from "@/config"
import { type BinaryVersions, ensureMediaBinaries } from "@/lib/media/binaries"
import { download } from "@/lib/media/download"
import { lastLine, MediaIngestError } from "@/lib/media/errors"
import {
  type ParsedSource,
  parseSourceUrl,
  SUPPORTED_SOURCE_LABELS,
} from "@/lib/media/sources"
import { logger } from "@/lib/observability/logger"

/**
 * Media ingest (PRD §4.1, TRD §3 steps 2 and 8).
 *
 * yt-dlp downloads the best audio stream (src/lib/media/download.ts) and
 * ffmpeg transcodes it to a small mono MP3, both spawned through Bun's `$`
 * into a per-run temp directory. `withIngestedAudio` owns that directory's
 * whole lifetime, so a failure anywhere — download, transcode, or the
 * caller's own work — still hits the `finally` that deletes it (PRD §5: no
 * media is retained).
 */

export type { IngestErrorCode } from "@/lib/media/errors"
export { MediaIngestError } from "@/lib/media/errors"

export interface IngestedAudio {
  /** Absolute path to the extracted MP3, valid only inside the scope. */
  audioPath: string
  audioBytes: number
  source: ParsedSource
  title: string | null
  durationSeconds: number | null
  /** Pruned yt-dlp metadata — stored verbatim in the run's additional_data. */
  info: Record<string, unknown>
  binaries: BinaryVersions
  timings: { downloadMs: number; extractMs: number }
}

/**
 * Bun's `rm` shell builtin silently no-ops on Windows when the path starts
 * with `./` — it exits 0 with empty stderr and leaves the directory in
 * place, so nothing looks wrong while every run leaks its media. The
 * configured temp dir defaults to `./data/tmp`, so strip that prefix once
 * here and hand the shell a clean relative path.
 */
const TEMP_ROOT = config.media.tempDir.replace(/^\.\/+/, "")

function runDir(runId: string): string {
  return `${TEMP_ROOT}/run-${runId}`
}

async function exists(path: string): Promise<boolean> {
  // Bun.file().exists() is false for directories; stat() throws ENOENT.
  try {
    await Bun.file(path).stat()
    return true
  } catch {
    return false
  }
}

async function extractAudio(mediaPath: string, dir: string): Promise<string> {
  const { format, codec, channels, sampleRate, bitrate } = config.media.audio
  const audioPath = `${dir}/audio.${format}`
  const args = [
    "-y",
    "-loglevel",
    "error",
    "-i",
    mediaPath,
    "-vn",
    "-acodec",
    codec,
    "-ac",
    channels,
    "-ar",
    sampleRate,
    "-b:a",
    bitrate,
    audioPath,
  ]
  const result = await $`${config.media.ffmpegPath} ${args}`.nothrow().quiet()

  if (result.exitCode !== 0) {
    throw new MediaIngestError(
      "EXTRACT_FAILED",
      `Audio extraction failed: ${lastLine(result.stderr.toString()) || "ffmpeg failed"}`,
    )
  }
  return audioPath
}

async function ingest(url: string, dir: string): Promise<IngestedAudio> {
  const source = parseSourceUrl(url)
  if (!source) {
    throw new MediaIngestError(
      "SOURCE_UNSUPPORTED",
      `That link isn't a supported public ${SUPPORTED_SOURCE_LABELS}.`,
    )
  }

  const binaries = await ensureMediaBinaries()
  await $`mkdir -p ${dir}`.quiet()

  const downloadStart = performance.now()
  const { mediaPath, info } = await download(source, dir)
  const downloadMs = Math.round(performance.now() - downloadStart)

  const extractStart = performance.now()
  const audioPath = await extractAudio(mediaPath, dir)
  const extractMs = Math.round(performance.now() - extractStart)

  const duration = info.duration
  return {
    audioPath,
    audioBytes: Bun.file(audioPath).size,
    source,
    title: typeof info.title === "string" ? info.title : null,
    durationSeconds: typeof duration === "number" ? duration : null,
    info,
    binaries,
    timings: { downloadMs, extractMs },
  }
}

/**
 * Best-effort — a cleanup failure must never mask the run's own outcome,
 * so this never throws. It does verify the directory actually went away
 * rather than trusting the exit code, because the `./` bug above proved a
 * successful-looking `rm` can leave everything on disk.
 */
async function purge(dir: string, runId: string): Promise<void> {
  const result = await $`rm -rf ${dir}`.nothrow().quiet()
  if (await exists(dir)) {
    logger.error("Temp media cleanup failed — artifacts left on disk", {
      run_id: runId,
      dir,
      exit_code: result.exitCode,
      stderr: lastLine(result.stderr.toString()),
    })
  }
}

/**
 * Downloads to a per-run temp directory, hands the MP3 to `consume`, and
 * deletes the directory no matter how that ends. The audio path is only
 * valid for the duration of the callback.
 */
export async function withIngestedAudio<T>(
  input: { url: string; runId: string },
  consume: (audio: IngestedAudio) => Promise<T>,
): Promise<T> {
  const dir = runDir(input.runId)
  try {
    const audio = await ingest(input.url, dir)
    logger.info("Media ingested", {
      run_id: input.runId,
      source: audio.source.source,
      item_id: audio.source.itemId,
      audio_bytes: audio.audioBytes,
      duration_seconds: audio.durationSeconds,
      ...audio.timings,
    })
    return await consume(audio)
  } catch (error) {
    logger.error("Media ingest failed", {
      run_id: input.runId,
      code: error instanceof MediaIngestError ? error.code : "UNKNOWN",
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  } finally {
    await purge(dir, input.runId)
  }
}

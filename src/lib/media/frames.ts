import { $ } from "bun"

import config from "@/config"
import { withSourceCookies } from "@/lib/media/cookies"
import { lastLine, MediaIngestError } from "@/lib/media/errors"
import type { ParsedSource } from "@/lib/media/sources"
import { runYtDlp, scrubProxy } from "@/lib/media/ytdlp"
import { logger } from "@/lib/observability/logger"

/**
 * One contact sheet for the frames path (PRD §4.2, "no speech" branch).
 *
 * WHY THERE IS A SECOND DOWNLOAD. The audio download selects
 * `-f bestaudio/best`, which for YouTube resolves to a format with
 * `vcodec: none` — there is no video on disk to take frames from. So this
 * fetches a video-only stream of its own, at ~480px on the short side
 * (~1.5 MB for a 20s Reel). Measured 2026-09-04; LLM_STATE.md has the
 * numbers, including why the storyboard mosaics yt-dlp offers are useless
 * here (101x180 per tile, nothing readable).
 *
 * WHY BUCKETS. Selecting on `gt(scene,N)` and capping with `-frames:v`
 * takes the FIRST N cuts, and a jump-cut Short puts them all in its
 * opening seconds — a measured clip had 37 cuts with the first six inside
 * 12s of 64s, so the payoff was never sampled. Instead every cut is scored
 * in one pass, and the highest scorer in each equal-duration bucket is
 * kept.
 */

export interface ContactSheet {
  /** JPEG inside the run's temp dir; valid only while that dir lives. */
  path: string
  bytes: number
  /** Frame times in reading order, seconds — the prompt states these. */
  atSeconds: number[]
  /** The clip's own length, so a frame's window cannot run past its end. */
  durationSeconds: number
  grid: { columns: number; rows: number }
  cellWidth: number
  timings: { downloadMs: number; renderMs: number }
}

/** ffmpeg reports duration on stderr; there is no ffprobe dependency. */
async function probeDuration(path: string): Promise<number> {
  const probe =
    await $`${config.media.ffmpegPath} -hide_banner -i ${path} -f null -`
      .nothrow()
      .quiet()
  const match = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(probe.stderr.toString())
  if (!match) return 0
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

interface Cut {
  at: number
  score: number
}

async function scanCuts(path: string): Promise<Cut[]> {
  const filter = `select='gt(scene,${config.media.frames.sceneThreshold})',metadata=print:file=-`
  const scan =
    await $`${config.media.ffmpegPath} -hide_banner -i ${path} -filter:v ${filter} -f null -`
      .nothrow()
      .quiet()
  // `metadata=print` writes to stdout, but ffmpeg's own -loglevel lines go
  // to stderr and the two have been observed interleaved; scanning both
  // costs nothing and makes the parse independent of that.
  const text = scan.stdout.toString() + scan.stderr.toString()
  const cuts: Cut[] = []
  for (const match of text.matchAll(
    /pts_time:([\d.]+)[\s\S]*?scene_score=([\d.]+)/g,
  )) {
    cuts.push({ at: Number(match[1]), score: Number(match[2]) })
  }
  return cuts
}

/**
 * The strongest cut inside each equal-duration bucket, falling back to the
 * bucket's midpoint when it holds no cut — a single-shot clip has no cuts
 * at all and must still yield frames.
 */
function pickTimes(cuts: Cut[], duration: number, wanted: number): number[] {
  const times: number[] = []
  for (let index = 0; index < wanted; index++) {
    const from = (duration * index) / wanted
    const to = (duration * (index + 1)) / wanted
    const inside = cuts
      .filter((cut) => cut.at >= from && cut.at < to)
      .sort((a, b) => b.score - a.score)
    times.push(inside[0]?.at ?? (from + to) / 2)
  }
  return times
}

async function fetchVideo(options: {
  source: ParsedSource
  dir: string
  cookiesPath: string | null
}): Promise<string> {
  const { source, dir, cookiesPath } = options
  const pathFile = `${dir}/frames.path`
  await $`rm -f ${pathFile}`.nothrow().quiet()

  const attempt = await runYtDlp(
    source,
    dir,
    pathFile,
    null,
    cookiesPath,
    config.media.proxyUrl,
    {
      format: config.media.frames.format,
      formatSort: config.media.frames.formatSort,
      outputName: "frames-source",
      writeInfoJson: false,
    },
  )
  // yt-dlp reports the final path through `--print-to-file`, not through
  // the attempt — the rename happens after the download, so nothing else
  // knows the container it settled on.
  const printed = await Bun.file(pathFile)
    .text()
    .catch(() => "")
  const written = printed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (!attempt.ok || written.length === 0) {
    throw new MediaIngestError(
      "DOWNLOAD_FAILED",
      `Could not fetch video for frame analysis: ${
        scrubProxy(lastLine(attempt.stderr)) || "yt-dlp failed"
      }`,
    )
  }
  return written[written.length - 1]
}

export async function buildContactSheet(options: {
  source: ParsedSource
  dir: string
  cookiesPath: string | null
  runId: string
}): Promise<ContactSheet> {
  const { source, dir, cookiesPath, runId } = options
  const { columns, rows, cellWidth, jpegQuality } = config.media.frames
  const wanted = columns * rows

  const downloadStart = performance.now()
  const videoPath = await fetchVideo({ source, dir, cookiesPath })
  const downloadMs = Math.round(performance.now() - downloadStart)

  const renderStart = performance.now()
  const duration = await probeDuration(videoPath)
  if (duration <= 0) {
    throw new MediaIngestError(
      "EXTRACT_FAILED",
      "Could not read the video's duration for frame analysis",
    )
  }

  const cuts = await scanCuts(videoPath)
  const atSeconds = pickTimes(cuts, duration, wanted)

  // `-ss` BEFORE `-i` seeks without decoding everything up to that point,
  // which is what keeps four seeks over a 60s clip cheap.
  for (const [index, at] of atSeconds.entries()) {
    const frame =
      await $`${config.media.ffmpegPath} -hide_banner -loglevel error -y -ss ${at.toFixed(3)} -i ${videoPath} -frames:v 1 -vf ${`scale=${cellWidth}:-2`} ${`${dir}/frame-${index}.jpg`}`
        .nothrow()
        .quiet()
    if (frame.exitCode !== 0) {
      throw new MediaIngestError(
        "EXTRACT_FAILED",
        `Frame extraction failed: ${lastLine(frame.stderr.toString()) || "ffmpeg failed"}`,
      )
    }
  }

  const path = `${dir}/contact-sheet.jpg`
  const tile =
    await $`${config.media.ffmpegPath} -hide_banner -loglevel error -y -i ${`${dir}/frame-%d.jpg`} -filter_complex ${`tile=${columns}x${rows}`} -frames:v 1 -q:v ${jpegQuality} ${path}`
      .nothrow()
      .quiet()
  if (tile.exitCode !== 0) {
    throw new MediaIngestError(
      "EXTRACT_FAILED",
      `Contact sheet failed: ${lastLine(tile.stderr.toString()) || "ffmpeg failed"}`,
    )
  }

  const bytes = Bun.file(path).size
  const renderMs = Math.round(performance.now() - renderStart)
  logger.info("Contact sheet built", {
    run_id: runId,
    cuts: cuts.length,
    frames: atSeconds.length,
    at_seconds: atSeconds.map((at) => Number(at.toFixed(1))),
    sheet_bytes: bytes,
    download_ms: downloadMs,
    render_ms: renderMs,
  })

  return {
    path,
    bytes,
    atSeconds,
    durationSeconds: duration,
    grid: { columns, rows },
    cellWidth,
    timings: { downloadMs, renderMs },
  }
}

/**
 * The same thing, with the user's jar in scope. Instagram cannot fetch a
 * Reel without one, and the audio download's jar is already gone by the
 * time the frames path decides it needs video, so it opens its own.
 */
export async function contactSheetForRun(options: {
  source: ParsedSource
  dir: string
  userId: string
  runId: string
}): Promise<ContactSheet> {
  const { source, dir, userId, runId } = options
  return await withSourceCookies({ source, userId, dir }, (cookies) =>
    buildContactSheet({
      source,
      dir,
      cookiesPath: cookies?.path ?? null,
      runId,
    }),
  )
}

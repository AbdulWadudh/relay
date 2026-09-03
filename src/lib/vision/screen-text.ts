import { runChat } from "@/lib/extraction/chat"
import type { ContactSheet } from "@/lib/media/frames"
import { logger } from "@/lib/observability/logger"
import type { TranscriptSegment } from "@/lib/transcription"
import {
  VISION_SCHEMA,
  VISION_SYSTEM,
  visionUserPrompt,
} from "@/lib/vision/prompt"

/**
 * Reads a contact sheet and returns TIMESTAMPED SEGMENTS, not a summary
 * (Task 4.3b).
 *
 * This is an adapter, deliberately. Everything downstream is built on
 * timestamped text: agent routing reads it, and src/lib/extraction/
 * evidence.ts and verify.ts check every extracted quote against the
 * segments. A prose summary would carry no verifiable quotes and would
 * have to bypass that check — the one thing keeping the output honest. So
 * the model is asked only to READ the frames, and its answer lands in the
 * same shape Whisper's does.
 *
 * The call goes through `runChat`, so it inherits the account fallback
 * chain, rate-limit handling and catalog caching, and it names no model:
 * passing an image narrows the ranker to catalog entries advertising image
 * input (src/lib/extraction/models.ts).
 */

export interface ScreenReading {
  segments: TranscriptSegment[]
  /**
   * Only the frames that actually carried TEXT. When speech is also being
   * read, "a man in an orange shirt speaks" is noise the audio already
   * covers — but on a music-only clip a description is all there is, so
   * both lists are returned and the caller picks (src/lib/analysis.ts).
   */
  textSegments: TranscriptSegment[]
  /** Joined text, for the callers that want one blob. */
  text: string
  provider: string
  model: string
}

interface VisionFrame {
  frame?: number
  on_screen_text?: string
  description?: string
}

async function sheetAsDataUrl(path: string): Promise<string> {
  const bytes = await Bun.file(path).bytes()
  return `data:image/jpeg;base64,${bytes.toBase64()}`
}

/**
 * A frame's window runs to the next frame's timestamp, because that is the
 * span it actually stands for — the sheet samples one image per stretch of
 * the clip, not one instant.
 *
 * The last window ends at the CLIP's end. Extrapolating a median gap
 * instead put the final segment at 62.0s-84.9s on a 64.5s video (measured
 * 2026-09-04), and evidence verification compares quotes against segment
 * times, so a window past the end is a quote that never existed.
 */
function windowsFor(
  atSeconds: number[],
  durationSeconds: number,
): { startMs: number; endMs: number }[] {
  return atSeconds.map((at, index) => {
    const next = atSeconds[index + 1] ?? durationSeconds
    return {
      startMs: Math.round(at * 1000),
      endMs: Math.round(Math.max(next, at) * 1000),
    }
  })
}

/**
 * Models answer "No text visible, showing a hand tapping a phone" in the
 * on_screen_text field despite being told to leave it empty (measured
 * 2026-09-04). That is a DESCRIPTION, so treating it as read text would
 * put it in front of an extraction agent as though it were content — and
 * would survive the `both`-mode filter that exists to drop exactly this.
 */
const NOT_ACTUAL_TEXT =
  /^(no|none|n\/a|nothing)\b|^(there is |there's )?no (visible |readable |discernible )?text/i

/**
 * A model asked for the text on a frame full of street signs answers with
 * a bulleted list, newlines and all. Segments are one line each downstream.
 */
function oneLine(value: string): string {
  return value
    .replace(/\s*[\r\n]+\s*/g, " · ")
    .replace(/\s{2,}/g, " ")
    .trim()
}

export async function readScreenText(options: {
  userId: string
  runId: string
  sheet: ContactSheet
  title: string | null
  description: string | null
  signal?: AbortSignal
}): Promise<ScreenReading> {
  const { userId, runId, sheet, title, description, signal } = options

  const run = await runChat({
    userId,
    task: "extraction",
    system: VISION_SYSTEM,
    user: visionUserPrompt({ sheet, title, description }),
    jsonSchema: VISION_SCHEMA,
    imageDataUrl: await sheetAsDataUrl(sheet.path),
    signal,
  })

  const parsed = JSON.parse(run.content) as { frames?: VisionFrame[] }
  const frames = Array.isArray(parsed.frames) ? parsed.frames : []
  const windows = windowsFor(sheet.atSeconds, sheet.durationSeconds)

  const segments: TranscriptSegment[] = []
  const textSegments: TranscriptSegment[] = []
  for (const [index, window] of windows.entries()) {
    // `frame` is 1-based in the prompt because that is how the sheet is
    // described to the model; a model that omits it falls back to position.
    const found =
      frames.find((frame) => frame.frame === index + 1) ?? frames[index]
    const claimed =
      typeof found?.on_screen_text === "string"
        ? oneLine(found.on_screen_text)
        : ""
    const onScreen = NOT_ACTUAL_TEXT.test(claimed) ? "" : claimed
    const described =
      typeof found?.description === "string" ? oneLine(found.description) : ""

    // The rejected phrasing still describes the frame, so it is kept as a
    // description rather than thrown away.
    const parts = [onScreen, described || (onScreen ? "" : claimed)].filter(
      (part) => part.length > 0,
    )
    if (parts.length === 0) continue
    const segment = { ...window, text: parts.join(" — ") }
    segments.push(segment)
    if (onScreen.length > 0) textSegments.push({ ...window, text: onScreen })
  }

  const text = segments.map((segment) => segment.text).join("\n")
  logger.info("Screen text read", {
    run_id: runId,
    provider: run.provider,
    model: run.model,
    frames_described: segments.length,
    frames_with_text: textSegments.length,
    of_frames: sheet.atSeconds.length,
    characters: text.length,
  })

  return {
    segments,
    textSegments,
    text,
    provider: run.provider,
    model: run.model,
  }
}

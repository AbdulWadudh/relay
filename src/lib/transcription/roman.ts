import { chatCompletion } from "@/lib/llm/client"
import type { TranscriptionProvider } from "@/lib/transcription/providers"
import type { TranscriptSegment } from "@/lib/transcription/whisper"

/**
 * The Roman/phonetic stream (PRD §4.2).
 *
 * Whisper returns audio in its *native script* — Hindi comes back as
 * Devanagari, not "Hinglish". When the transcript is already mostly Latin
 * (genuine Hinglish/Spanglish, which is the common case) it is passed
 * through untouched and costs nothing. Otherwise a chat model
 * transliterates it — phonetically, NOT translating, so the Roman stream
 * stays a record of what was actually said.
 *
 * A Whisper decoding `prompt` was tried for this and removed: it does not
 * produce Latin script for Hindi, and it leaks into the transcript on
 * low-speech audio. See the note in whisper.ts.
 */

const SYSTEM =
  "You transliterate text into the Latin (Roman) alphabet. Reproduce the sounds of the original words phonetically. Do NOT translate, do not explain, do not add or remove content. Return only the transliterated text."

/**
 * Share of letters that must already be Latin to skip transliteration.
 * Below this, a mostly-Devanagari transcript would be unreadable to the
 * Roman stream's audience; above it, occasional loan characters aren't
 * worth an extra model call.
 */
const LATIN_THRESHOLD = 0.7

export function latinRatio(text: string): number {
  const letters = text.match(/\p{L}/gu)
  if (!letters || letters.length === 0) return 1
  const latin = text.match(/\p{Script=Latin}/gu)?.length ?? 0
  return latin / letters.length
}

export function isMostlyLatin(text: string): boolean {
  return latinRatio(text) >= LATIN_THRESHOLD
}

export interface RomanStream {
  text: string
  segments: TranscriptSegment[]
  /** True when a transliteration pass ran (step 2 above). */
  transliterated: boolean
  latinRatio: number
}

/**
 * Transliterates line by line so segment timings survive: the model is given
 * numbered lines and must return the same count, and if it doesn't we keep
 * the original rather than silently misaligning evidence timestamps — which
 * Task 4.5 verifies quotes against.
 */
export async function toRomanScript(options: {
  provider: TranscriptionProvider
  apiKey: string
  text: string
  segments: TranscriptSegment[]
  signal?: AbortSignal
}): Promise<RomanStream> {
  const { provider, apiKey, text, segments, signal } = options
  const ratio = latinRatio(text)

  if (isMostlyLatin(text)) {
    return { text, segments, transliterated: false, latinRatio: ratio }
  }

  // No segments to preserve — transliterate the whole thing in one go.
  if (segments.length === 0) {
    const romanized = await chatCompletion({
      baseUrl: provider.baseUrl,
      apiKey,
      model: provider.chatModel,
      system: SYSTEM,
      user: text,
      signal,
    })
    return {
      text: romanized.trim(),
      segments,
      transliterated: true,
      latinRatio: ratio,
    }
  }

  const numbered = segments
    .map((segment, index) => `${index + 1}. ${segment.text}`)
    .join("\n")

  const response = await chatCompletion({
    baseUrl: provider.baseUrl,
    apiKey,
    model: provider.chatModel,
    system: `${SYSTEM} The input is a numbered list. Return the same numbered list, same count, same order, with each line transliterated.`,
    user: numbered,
    signal,
  })

  const lines = response
    .split("\n")
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter((line) => line.length > 0)

  if (lines.length !== segments.length) {
    // Misaligned output would attach the wrong timestamps to the wrong
    // words. The untransliterated text is worse to read but still correct.
    return { text, segments, transliterated: false, latinRatio: ratio }
  }

  const romanSegments = segments.map((segment, index) => ({
    ...segment,
    text: lines[index] as string,
  }))
  return {
    text: romanSegments.map((segment) => segment.text).join(" "),
    segments: romanSegments,
    transliterated: true,
    latinRatio: ratio,
  }
}

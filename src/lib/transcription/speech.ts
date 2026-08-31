import type { SpeechConfidence } from "@/lib/transcription/whisper"

/**
 * The no-speech gate (Task 4.3).
 *
 * Whisper invents plausible filler when handed audio with no speech —
 * measured on real clips, a music-only Short returned "Thank you for
 * watching!" while a narrated Hindi clip returned its actual content.
 * Publishing fabricated speech is precisely the failure this product
 * exists to prevent (PRD §2, §6), so the text is discarded rather than
 * passed downstream.
 */

/**
 * Measured on two real clips: narrated Hindi 0.107, music-only 0.701.
 * A midpoint threshold separates them with wide margin on both sides.
 */
const NO_SPEECH_PROB_LIMIT = 0.5

/**
 * `avg_logprob` was also gated on and REMOVED. Measured across whole clips
 * it is *anti-correlated* with speech here — the narrated clip averaged
 * -1.278 while the music-only clip averaged -0.708 — so a "logprob too
 * low" rule rejected genuine speech (it did, on the first run). The value
 * is still recorded for auditing, but `no_speech_prob` is the field
 * actually designed for this decision and is the only one gated on.
 */
export function hasSpeech(confidence: SpeechConfidence): boolean {
  return (
    confidence.segmentCount > 0 &&
    confidence.meanNoSpeechProb < NO_SPEECH_PROB_LIMIT
  )
}

/**
 * Thrown by the *pipeline*, not by the transcription module: transcription
 * reports `hasSpeech: false` as a signal so the caller can fall back to the
 * frame/vision layer. Only when no source yields content does a run fail
 * with this.
 */
export class NoSpeechError extends Error {
  readonly code = "NO_SPEECH"
  readonly confidence: SpeechConfidence

  constructor(confidence: SpeechConfidence) {
    super(
      "No speech detected in this clip — it looks like music or silence, and no on-screen content could be read either.",
    )
    this.name = "NoSpeechError"
    this.confidence = confidence
  }
}

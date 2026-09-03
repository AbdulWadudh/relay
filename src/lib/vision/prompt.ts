import type { ContactSheet } from "@/lib/media/frames"

/**
 * What the vision model is asked for, and the shape it must answer in.
 *
 * It is asked to TRANSCRIBE, not to summarise. Interpretation is the
 * agent layer's job (src/lib/extraction), and it is verified against
 * evidence there; a summary produced here would arrive with nothing to
 * verify against. So the instruction is deliberately narrow: read what is
 * on the frame, and say what is visible only when there is no text.
 */

export const VISION_SYSTEM = [
  "You read frames from a short vertical video and transcribe what is on them.",
  "Transcribe on-screen text EXACTLY as written, including numbers, units and punctuation.",
  "Do not translate, correct spelling, or rephrase. Keep the original language.",
  "Never infer a step, quantity or claim that is not visible in the frame.",
  "IGNORE channel watermarks, handles and logos that repeat across frames — they are branding, not content.",
  "If a frame carries no text, leave on_screen_text EMPTY and describe what is shown in description, in one short clause.",
  "Never write 'no text' or 'none' into on_screen_text — an empty string is how you say that.",
  /**
   * The word "json" is REQUIRED here, not stylistic. A model that does not
   * advertise `structured` gets `response_format: { type: "json_object" }`
   * instead of a schema, and Groq and OpenAI both reject that mode outright
   * unless the messages contain the literal token: "'messages' must contain
   * the word 'json' in some form" (measured in production 2026-09-04, which
   * is why the frames stage could not use Groq at all).
   */
  "Answer with a single JSON object holding a `frames` array, one entry per frame.",
].join(" ")

/**
 * Frame windows are NOT burned into the image. `drawtext` needs a font
 * file, which is not guaranteed on every host this runs on (Windows dev,
 * Alpine in the image), and a missing font is a hard ffmpeg failure. The
 * times are stated here instead, which costs a few tokens and cannot
 * break.
 */
export function visionUserPrompt(options: {
  sheet: ContactSheet
  title: string | null
  description: string | null
}): string {
  const { sheet, title, description } = options
  const { columns, rows } = sheet.grid

  const times = sheet.atSeconds
    .map((at, index) => `${index + 1}. ${at.toFixed(1)}s`)
    .join(", ")

  const lines = [
    `The image is a ${columns}x${rows} grid of ${sheet.atSeconds.length} frames from one video, in chronological order, left to right then top to bottom.`,
    `Frame times: ${times}.`,
  ]

  // Metadata is free and often names the thing the frames only show, so it
  // goes in as CONTEXT — never as something to transcribe.
  if (title) lines.push(`The video's title is: ${title}`)
  if (description) {
    lines.push(
      `The uploader's caption is: ${description.slice(0, 800)}`,
      "Use the title and caption only to disambiguate what you can see. Do not copy them into your answer.",
    )
  }

  lines.push(
    "Return one entry per frame, numbered to match the frame times above.",
  )
  return lines.join("\n")
}

export const VISION_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    frames: {
      type: "array",
      items: {
        type: "object",
        properties: {
          frame: {
            type: "integer",
            description: "1-based frame number, matching the stated times",
          },
          on_screen_text: {
            type: "string",
            description:
              "Text visible on this frame, verbatim. An EMPTY STRING when the frame has none — never a phrase saying so.",
          },
          description: {
            type: "string",
            description:
              "What the frame shows. Only needed when it carries no text.",
          },
        },
        required: ["frame"],
      },
    },
  },
  required: ["frames"],
}

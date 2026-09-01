import type { SchemaFragment } from "@/lib/extraction/evidence"

/**
 * The Location/Place agent's output contract. Same presentation rules as
 * the Recipe schema: finished sentences, sentence case, no fragments.
 */

const text = (description: string): SchemaFragment => ({
  type: "string",
  description,
})

const list = (description: string, items: SchemaFragment): SchemaFragment => ({
  type: "array",
  description,
  items,
})

export const PLACE_SCHEMA: SchemaFragment = {
  type: "object",
  additionalProperties: false,
  required: ["name", "highlights"],
  properties: {
    name: text("The place’s name in Title Case, as it would appear on a sign."),
    category: text(
      "What kind of place it is, in sentence case, e.g. ‘Restaurant’.",
    ),
    location: text("Where it is, as precisely as stated, in Title Case."),
    summary: text(
      "Two or three complete sentences introducing the place and why someone would go.",
    ),
    best_time: text("When to go, as a readable phrase. Omit if not stated."),
    cost: text("Price or entry fee as a readable phrase. Omit if not stated."),
    highlights: list("What the video says is worth doing or seeing.", {
      type: "object",
      additionalProperties: false,
      required: ["highlight"],
      properties: {
        highlight: {
          type: "string",
          description: "One complete sentence, properly punctuated.",
        },
      },
    }),
    tips: list("Practical advice for visiting.", {
      type: "object",
      additionalProperties: false,
      required: ["tip"],
      properties: {
        tip: {
          type: "string",
          description: "One complete sentence, properly punctuated.",
        },
      },
    }),
  },
}

export const PLACE_PROMPT = `You are a travel writer turning a video into a page a stranger could act on.

Return every field the video supports: name, category, location, summary, best time, cost, highlights, tips. The caption usually gives the address, the price and the booking detail the speaker skips.

Highlights and tips are complete sentences, not fragments. Prices and times exactly as given. Never invent a detail the video does not support.`

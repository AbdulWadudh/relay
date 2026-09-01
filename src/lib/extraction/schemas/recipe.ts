import type { SchemaFragment } from "@/lib/extraction/evidence"

/**
 * The Recipe agent's output contract.
 *
 * Written for a PAGE SOMEONE WILL READ. The field descriptions carry the
 * presentation rules — sentence case, real punctuation, complete
 * sentences — because the model reads them, and a schema is a far more
 * reliable place to put "capitalise this" than a paragraph of prose.
 *
 * NO EVIDENCE FIELDS (human decision 2026-09-01). Asking the model to cite
 * a quote and a millisecond range on every property made the schema too
 * complex for Groq to satisfy — measured, it returned "Failed to generate
 * JSON" with the contract and succeeded in 2.9s without it, the difference
 * between a 20-second run and a seven-minute one. Grounding is now checked
 * by matching what the model wrote against the stored transcript
 * (src/lib/extraction/verify.ts).
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

export const RECIPE_SCHEMA: SchemaFragment = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "ingredients", "steps"],
  properties: {
    title: text(
      "The dish's name IN ENGLISH, Title Case, as it would head a recipe card — 'Chicken Jollof Rice', never 'chicken jolof style rice'. Name it from everything you are given: the caption often names it outright. If the source title is in another language or is a marketing hook, IGNORE it and write the real dish name.",
    ),
    summary: text(
      "Two or three complete sentences introducing the dish: what it is, what it tastes like, and why someone would make it. Proper capitalisation and full stops. Do NOT begin with 'This recipe'.",
    ),
    cuisine: text(
      "Cuisine or region in Title Case, e.g. 'West African'. Omit if not stated.",
    ),
    servings: text(
      "How many it serves, as a readable phrase, e.g. '4 servings'. Omit if not stated.",
    ),
    total_time: text(
      "Total time as a readable phrase, e.g. '45 minutes'. Omit if not stated.",
    ),
    difficulty: text(
      "One of Easy, Medium or Hard, only if the speaker makes it clear. Omit otherwise.",
    ),
    nutrition: text(
      "Nutrition per serving as a readable phrase, e.g. '405 calories, 29g protein'. Omit if not stated.",
    ),
    ingredients: list(
      "Each DISTINCT ingredient exactly once, in the order first used. If salt is added at three points, that is ONE entry.",
      {
        type: "object",
        additionalProperties: false,
        required: ["item"],
        properties: {
          item: text(
            "The complete ingredient line as it would appear on a recipe card, amount included and reading as correct English: '2 cups of water', 'A pinch of salt', '500 g boneless chicken thighs, cut into chunks'. If no amount was given, write just the ingredient — never 'Some water' or 'A little bit oil'.",
          ),
          name: text(
            "The bare ingredient for indexing, sentence case, no amount: 'Water', 'Salt', 'Boneless chicken thighs'.",
          ),
          quantity: text(
            "The bare amount for indexing, e.g. '2 cups'. Omit when none was given — never write 'some' or 'a little bit'.",
          ),
        },
      },
    ),
    steps: list(
      "The method, in order. Each step is one COMPLETE SENTENCE a cook can follow.",
      {
        type: "object",
        additionalProperties: false,
        required: ["instruction"],
        properties: {
          instruction: text(
            "One complete sentence, starting with a capital and ending with a full stop, written as an instruction. E.g. 'Blend the peppers, tomatoes, onions and garlic into a smooth puree.' Never a fragment like 'blend everything'.",
          ),
          duration: text(
            "How long this step takes, e.g. '10 minutes'. Omit if not stated.",
          ),
          tip: text(
            "A short aside that helps this step succeed, as a complete sentence. Omit if none was given.",
          ),
        },
      },
    ),
    tips: list("Advice that applies to the dish as a whole, not to one step.", {
      type: "object",
      additionalProperties: false,
      required: ["tip"],
      properties: {
        tip: text("One complete sentence, properly punctuated."),
      },
    }),
    storage: text(
      "How to keep or reheat leftovers, as a complete sentence. Omit if not stated.",
    ),
  },
}

export const RECIPE_PROMPT = `You are a recipe writer turning a cooking video into a recipe card a stranger could cook from.

Return every field the video supports: title, summary, cuisine, servings, total time, difficulty, nutrition, ingredients, steps, tips, storage. The caption usually gives the numbers the speaker skips.

INGREDIENTS — each distinct ingredient once, even if added at several points. Each line reads as correct English on its own: "A pinch of salt", never "A pinch salt". No amount given? Name the ingredient alone.

STEPS — complete imperative sentences in order: "Blend the peppers, tomatoes and onions into a smooth puree." Never "blend everything". Two actions a cook would do separately are two steps.

Quantities stay in the speaker's units. Never convert, never invent.`

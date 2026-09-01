import { type Schema, type SchemaDraft, Validator } from "@cfworker/json-schema"
import { disableErrorLogging, parse } from "best-effort-json-parser"

/**
 * Parse then validate an agent's output; both must pass before anything
 * reaches `relay_runs.result`. `json_object` is a hint, not a guarantee,
 * so a best-effort parser recovers fences, trailing commas and truncated
 * tails. Validation uses a real JSON Schema validator because Zod cannot
 * consume arbitrary JSON Schema and the Agents UI accepts any pasted one.
 */

// The parser logs to console on every salvage; the run's own record of
// `repaired` is the signal that matters.
disableErrorLogging()

/** How many validation errors are fed back to the model on the retry. */
const MAX_FEEDBACK_ERRORS = 12

export interface ValidationFailure {
  /** JSON Pointer to the offending value, e.g. `/ingredients/2/evidence`. */
  path: string
  message: string
}

export type ParseResult =
  | { ok: true; value: unknown; repaired: boolean }
  | { ok: false; error: string }

/**
 * Strips a markdown fence the model wrapped its JSON in, then parses —
 * falling back to a repair pass. `repaired` is reported so the run records
 * that the provider's JSON mode did not hold.
 */
function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/**
 * Strips a markdown fence, then any prose the model wrapped around the
 * object. Models routinely answer "Here you go:" before the JSON, and the
 * parser will not skip it — so the first `{` to the last `}` is taken.
 */
function isolate(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = (fenced ? fenced[1] : raw).trim()
  // Sliced from the first `{` to the last `}` even when the body ALREADY
  // starts with `{`. The previous short-circuit on `startsWith` returned
  // such a body verbatim, so anything trailing the object survived into
  // JSON.parse. Measured 2026-09-02: gemma-4-31b-it answers with a valid
  // object followed by a bare closing ``` and no opening fence, which the
  // fence regex above cannot match — the object was well-formed and the
  // parse failed on the backtick. Trailing junk is now dropped the same
  // way leading prose already was.
  const open = body.indexOf("{")
  const close = body.lastIndexOf("}")
  return open !== -1 && close > open ? body.slice(open, close + 1) : body
}

export function parseModelJson(raw: string): ParseResult {
  const body = isolate(raw)

  try {
    const exact = asObject(JSON.parse(body))
    if (exact) return { ok: true, value: exact, repaired: false }
  } catch {
    // Fall through to the salvaging parser.
  }

  // best-effort-json-parser SALVAGES rather than throws: a truncated
  // response comes back as a partial object instead of an error. That is
  // usually what you want — schema validation is the real gate — but a
  // partial whose missing fields happen to be optional would sail through,
  // so a non-object is rejected here and `repaired` is recorded on the run.
  try {
    const salvaged = asObject(parse(body))
    if (!salvaged) {
      return { ok: false, error: "Response did not contain a JSON object" }
    }
    return { ok: true, value: salvaged, repaired: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * A schema may declare its own draft. Guessing wrong changes what `items`
 * and `exclusiveMinimum` mean, so the declaration is honoured when present
 * and 2020-12 (the validator's own default) is assumed otherwise.
 */
function draftOf(schema: Record<string, unknown>): SchemaDraft {
  const declared = typeof schema.$schema === "string" ? schema.$schema : ""
  if (declared.includes("draft-04")) return "4"
  if (declared.includes("draft-07")) return "7"
  if (declared.includes("2019-09")) return "2019-09"
  return "2020-12"
}

export function validateAgainstSchema(
  value: unknown,
  schema: Record<string, unknown>,
): ValidationFailure[] {
  const validator = new Validator(schema as Schema, draftOf(schema), false)
  const result = validator.validate(value)
  if (result.valid) return []
  return result.errors.map((unit) => ({
    path: unit.instanceLocation === "#" ? "/" : unit.instanceLocation,
    message: unit.error,
  }))
}

/**
 * The validation errors, rendered as the correction message handed back to
 * the model on its single retry. Capped, because a badly-shaped response
 * can produce hundreds of errors and re-sending all of them costs more
 * context than it buys accuracy.
 */
export function describeFailures(failures: ValidationFailure[]): string {
  const shown = failures.slice(0, MAX_FEEDBACK_ERRORS)
  const lines = shown.map((failure) => `- ${failure.path}: ${failure.message}`)
  if (failures.length > shown.length) {
    lines.push(`- ...and ${failures.length - shown.length} more`)
  }
  return lines.join("\n")
}

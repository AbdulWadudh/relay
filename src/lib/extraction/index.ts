import { runChat, type SkippedModel } from "@/lib/extraction/chat"
import { compactSchemaForPrompt } from "@/lib/extraction/evidence"
import { promptFor } from "@/lib/extraction/prompts"
import { type Routing, routeAgent } from "@/lib/extraction/route"
import {
  describeFailures,
  parseModelJson,
  type ValidationFailure,
  validateAgainstSchema,
} from "@/lib/extraction/validate"
import { logger } from "@/lib/observability/logger"
import type { TranscriptSegment } from "@/lib/transcription"

/**
 * Agent extraction (PRD §4.3, Task 4.4).
 *
 * Routes the clip to an agent, runs that agent's prompt and schema against
 * the English transcript, and returns output that has ALREADY been
 * validated against the schema — nothing unvalidated is ever handed back
 * for persisting to `relay_runs.result`.
 *
 * Exactly one retry on validation failure, and the retry is given the
 * actual validation errors. A second blind attempt would just re-roll the
 * same mistake; a corrected attempt usually lands.
 */

export { NoExtractionKeyError } from "@/lib/extraction/chat"
export type { Routing } from "@/lib/extraction/route"

export class ExtractionError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "ExtractionError"
    this.code = code
  }
}

export interface Extraction {
  routing: Routing
  provider: string
  model: string
  /** Schema-valid agent output. */
  data: Record<string, unknown>
  /** 1 when the first attempt validated, 2 when the retry was needed. */
  attempts: number
  /** True when the provider's JSON mode produced JSON that needed repair. */
  repaired: boolean
  /** Errors from the first attempt, kept when a retry was necessary. */
  firstAttemptErrors: ValidationFailure[]
  skippedModels: SkippedModel[]
  timings: { routeMs: number; extractMs: number }
}

/**
 * The transcript as the model sees it. Segments are labelled with the ms
 * range they were spoken in, which is what makes it possible for the model
 * to cite a timestamp range at all — and what Task 4.5 checks that range
 * against.
 */
export function formatTranscript(segments: TranscriptSegment[]): string {
  return segments
    .map((segment) => `[${segment.startMs}-${segment.endMs}ms] ${segment.text}`)
    .join("\n")
}

async function buildSystem(userId: string, routing: Routing): Promise<string> {
  return [
    await promptFor(userId, "evidence_contract"),
    "",
    "AGENT INSTRUCTIONS:",
    routing.systemPrompt,
    "",
    "JSON SCHEMA — your output must validate against this exactly:",
    JSON.stringify(compactSchemaForPrompt(routing.expectedOutputSchema)),
  ].join("\n")
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

export async function extract(options: {
  userId: string
  runId: string
  requestedAgentId: string | null
  title: string | null
  /** The post's caption or description — often names the subject outright. */
  description?: string | null
  segments: TranscriptSegment[]
  signal?: AbortSignal
}): Promise<Extraction> {
  const {
    userId,
    runId,
    requestedAgentId,
    title,
    description,
    segments,
    signal,
  } = options
  const transcript = formatTranscript(segments)

  const routeStart = performance.now()
  const routing = await routeAgent({
    userId,
    requestedAgentId,
    title,
    transcript,
    signal,
  })
  const routeMs = Math.round(performance.now() - routeStart)

  logger.info("Run routed to agent", {
    run_id: runId,
    mode: routing.mode,
    agent_id: routing.agentId,
    agent_name: routing.agentName,
    reason: routing.reason,
    route_ms: routeMs,
  })

  const promptSchema = compactSchemaForPrompt(routing.expectedOutputSchema)
  const system = await buildSystem(userId, routing)
  // The caption is a first-class source, not decoration: it routinely
  // carries the dish name, the servings and the nutrition that the speaker
  // never says aloud, and both the agent prompts and the schema field
  // descriptions instruct the model to read it.
  const caption = description?.trim()
  const baseUser = [
    `Video title: ${title ?? "(none)"}`,
    caption ? `Caption:\n${caption}` : null,
    `Transcript:\n${transcript}`,
  ]
    .filter((part) => part !== null)
    .join("\n\n")

  const extractStart = performance.now()
  const skippedModels: SkippedModel[] = []
  let firstAttemptErrors: ValidationFailure[] = []
  let repaired = false
  let user = baseUser
  let lastFailure = "The model did not return usable output."

  for (let attempt = 1; attempt <= 2; attempt++) {
    const run = await runChat({
      userId,
      task: "extraction",
      system,
      user,
      jsonSchema: promptSchema,
      signal,
    })
    skippedModels.push(...run.skipped)

    const parsed = parseModelJson(run.content)
    if (!parsed.ok) {
      lastFailure = `Response was not JSON: ${parsed.error}`
      user = `${baseUser}\n\nYour previous reply was not valid JSON (${parsed.error}). Return ONLY a JSON object matching the schema.`
      continue
    }
    repaired = repaired || parsed.repaired

    const data = asObject(parsed.value)
    if (!data) {
      lastFailure = "Response was JSON but not an object."
      user = `${baseUser}\n\nYour previous reply was not a JSON object. Return a single JSON object matching the schema.`
      continue
    }

    const failures = validateAgainstSchema(data, routing.expectedOutputSchema)
    if (failures.length === 0) {
      return {
        routing,
        provider: run.provider,
        model: run.model,
        data,
        attempts: attempt,
        repaired,
        firstAttemptErrors,
        skippedModels,
        timings: {
          routeMs,
          extractMs: Math.round(performance.now() - extractStart),
        },
      }
    }

    firstAttemptErrors = failures
    lastFailure = `Output did not match the schema (${failures.length} error${failures.length === 1 ? "" : "s"}).`
    logger.warn("Extraction failed validation", {
      run_id: runId,
      attempt,
      agent_id: routing.agentId,
      model: run.model,
      error_count: failures.length,
      first_error: failures[0]?.message,
    })
    // The retry is told exactly what was wrong; a blind re-roll would
    // reproduce the same mistake.
    user = `${baseUser}\n\nYour previous reply did not match the schema. Fix these problems and return the corrected JSON object:\n${describeFailures(failures)}`
  }

  throw new ExtractionError("EXTRACTION_INVALID", lastFailure)
}

import type { ChatProvider, ChatTask } from "@/lib/extraction/providers"

/**
 * Normalising and ranking a provider's `/models` reply. No model id is
 * written down — a model earns its place from advertised capability.
 *
 * Shapes verified against live payloads 2026-09-01: Groq publishes
 * modalities, context and `supported_features`; OpenRouter publishes
 * `supported_parameters` and `pricing`; OpenAI publishes nothing beyond
 * id/created/owned_by, which is why the heuristics below exist.
 */

export interface CatalogModel {
  id: string
  contextLength: number
  maxOutput: number
  created: number
  parameters: number
  json: boolean
  structured: boolean
  free: boolean
  vision: boolean
}

const NOT_A_CHAT_MODEL =
  /(^|[-/])(whisper|tts|embed(ding)?s?|moderation|rerank|guard|safeguard|dall-e|image|speech|audio|transcribe|ocr|vision-only)([-/.]|$)/i

const PARAMETER_SIZE = /(\d+(?:\.\d+)?)\s*b(?![a-z0-9])/gi

export function parameterCount(id: string): number {
  let largest = 0
  for (const match of id.matchAll(PARAMETER_SIZE)) {
    const value = Number(match[1])
    if (Number.isFinite(value) && value > largest) largest = value
  }
  return largest
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : []
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

/** Zero prompt AND completion price is the only reliable "free" signal. */
function isFree(row: Record<string, unknown>): boolean {
  const pricing = row.pricing as Record<string, unknown> | undefined
  if (!pricing) return true // Provider publishes no pricing (Groq).
  const prompt = Number(pricing.prompt ?? 0)
  const completion = Number(pricing.completion ?? 0)
  return prompt === 0 && completion === 0
}

export function normaliseModel(
  row: Record<string, unknown>,
): CatalogModel | null {
  const id = typeof row.id === "string" ? row.id : ""
  if (!id) return null
  // Groq flags withdrawn models rather than removing them.
  if (row.active === false) return null

  const architecture = (row.architecture ?? {}) as Record<string, unknown>
  const inputs = asArray(row.input_modalities ?? architecture.input_modalities)
  const outputs = asArray(
    row.output_modalities ?? architecture.output_modalities,
  )
  // Whisper reports output "transcription", Orpheus reports "speech".
  if (outputs.length > 0 && !outputs.includes("text")) return null
  if (inputs.length > 0 && !inputs.includes("text")) return null

  const features = [
    ...asArray(row.supported_features),
    ...asArray(row.supported_parameters),
  ]
  const topProvider = (row.top_provider ?? {}) as Record<string, unknown>

  return {
    id,
    contextLength: asNumber(row.context_length ?? row.context_window),
    maxOutput: asNumber(
      row.max_completion_tokens ?? topProvider.max_completion_tokens,
    ),
    created: asNumber(row.created),
    parameters: parameterCount(id),
    json:
      features.includes("json_mode") || features.includes("response_format"),
    structured: features.includes("structured_outputs"),
    free: isFree(row),
    vision: inputs.includes("image"),
  }
}

/**
 * `fallback` fills in what a provider's catalog does not advertise (see
 * ChatProvider.capabilities). Applied ONLY where the row itself said
 * nothing — a provider that publishes real per-model capabilities always
 * wins, so this can never overstate a model that declared its own limits.
 */
export function normaliseCatalog(
  rows: unknown[],
  fallback?: { json: boolean; structured: boolean; contextLength: number },
): CatalogModel[] {
  const models: CatalogModel[] = []
  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue
    const model = normaliseModel(row as Record<string, unknown>)
    if (model && fallback) {
      if (model.contextLength === 0)
        model.contextLength = fallback.contextLength
      if (!model.json) model.json = fallback.json
      if (!model.structured) model.structured = fallback.structured
    }
    if (model) models.push(model)
  }
  return models
}

/**
 * Eligibility, then order. Both stages read only advertised capability, so
 * "which model runs extraction" is a consequence of the catalog rather
 * than a decision recorded in this codebase.
 *
 * Order: JSON-capable first (extraction is a JSON job and a model without
 * it fails validation every time), then strict structured output, then the
 * larger context window, then the bigger model, and `created` only as a
 * last resort. Size sits above recency deliberately — see PARAMETER_SIZE.
 */
/**
 * A transcript plus a schema is a few thousand tokens. Past this, extra
 * context window buys nothing for this workload, so it stops being a
 * ranking signal and capability takes over — otherwise a 512k niche model
 * outranks a frontier one purely on a number neither run will use.
 */
const SUFFICIENT_CONTEXT = 64_000

/**
 * Where an unparseable size sits. Treating unknown as 0 ranked a model
 * that ADVERTISES being tiny (liquid/lfm-2.5-2.6b) above one that simply
 * does not state a size (z-ai/glm-5.2) — measured on OpenRouter's free
 * pool. Scoring unknown as mid-sized keeps declared-large above unknown
 * and unknown above declared-small.
 */
const ASSUMED_PARAMETERS = 30

function sizeScore(model: CatalogModel): number {
  return model.parameters === 0 ? ASSUMED_PARAMETERS : model.parameters
}

export function rankModels(
  models: CatalogModel[],
  provider: ChatProvider,
  task: ChatTask,
): CatalogModel[] {
  const capabilitiesPublished = models.some(
    (model) => model.contextLength > 0 || model.json,
  )

  const eligible = models.filter((model) => {
    if (NOT_A_CHAT_MODEL.test(model.id)) return false
    if (provider.freeOnly && !model.free) return false
    if (!capabilitiesPublished) return true
    if (model.contextLength > 0 && model.contextLength < provider.minContext) {
      return false
    }
    // A provider that flags JSON support at all is trusted about which of
    // its models lack it; one that flags none is not held to the standard.
    return models.some((other) => other.json) ? model.json : true
  })

  // Synthesis reads a truncated transcript, so it needs even less context
  // than extraction; both cap the signal, extraction just caps it higher.
  const ceiling =
    task === "synthesis" ? SUFFICIENT_CONTEXT / 2 : SUFFICIENT_CONTEXT
  const usable = (model: CatalogModel) => Math.min(model.contextLength, ceiling)

  return eligible.sort((a, b) => {
    if (a.json !== b.json) return a.json ? -1 : 1
    if (a.structured !== b.structured) return a.structured ? -1 : 1
    if (usable(a) !== usable(b)) return usable(b) - usable(a)
    if (sizeScore(a) !== sizeScore(b)) return sizeScore(b) - sizeScore(a)
    if (a.contextLength !== b.contextLength) {
      return b.contextLength - a.contextLength
    }
    if (a.created !== b.created) return b.created - a.created
    return a.id.localeCompare(b.id)
  })
}

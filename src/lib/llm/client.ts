import config from "@/config"

/**
 * Minimal OpenAI-compatible chat client (Task 4.3, reused by 4.4).
 *
 * Every provider in the transcription registry speaks this shape, so one
 * client covers all of them. The API key is passed per call and is never
 * logged, never stored on the module, and never included in a thrown
 * error's message (RULES.md / PRD §6: zero plaintext token exposure).
 */

/**
 * A request that never answers is worse than one that fails: the run
 * cannot fall through to the next model while it waits. The caller's own
 * signal still wins when it fires first.
 */
function withTimeout(signal: AbortSignal | undefined): AbortSignal {
  const timeout = AbortSignal.timeout(config.llm.timeoutMs)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

export class LlmError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "LlmError"
    this.status = status
  }
}

export interface ChatRequest {
  baseUrl: string
  apiKey: string
  model: string
  system: string
  user: string
  /** Ask the provider for a JSON object back (extraction in Task 4.4). */
  json?: boolean
  /**
   * Schema-constrained decoding, for models that advertise it. Stronger
   * than `json`, which only guarantees syntactic JSON and not conformance.
   * `strict` is deliberately off: strict mode requires every property to
   * be listed in `required`, and Relay's schemas omit a field the video
   * never supported rather than emitting a null.
   */
  jsonSchema?: { name: string; schema: Record<string, unknown> }
  /**
   * A `data:image/...;base64,...` URL sent alongside `user`, for a model
   * that advertises image input. Providers accept the OpenAI multimodal
   * content-part shape, so this stays one client rather than a second.
   */
  imageDataUrl?: string
  temperature?: number
  signal?: AbortSignal
}

interface ChatResponse {
  choices?: { message?: { content?: string } }[]
  error?: { message?: string }
}

/**
 * Strips anything key-shaped out of a provider error before it can reach a
 * log line or a run's stored `error` column.
 */
function safeMessage(raw: string, apiKey: string): string {
  const withoutKey = apiKey ? raw.split(apiKey).join("[REDACTED]") : raw
  return withoutKey.slice(0, 400)
}

export async function chatCompletion(request: ChatRequest): Promise<string> {
  const response = await fetch(`${request.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${request.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: request.model,
      temperature: request.temperature ?? 0,
      ...(request.jsonSchema
        ? {
            response_format: {
              type: "json_schema",
              json_schema: {
                name: request.jsonSchema.name,
                schema: request.jsonSchema.schema,
                strict: false,
              },
            },
          }
        : request.json
          ? { response_format: { type: "json_object" } }
          : {}),
      messages: [
        { role: "system", content: request.system },
        {
          role: "user",
          // A bare string when there is no image, because that is what
          // every text-only provider has been verified against; the parts
          // array is only introduced when it has to be.
          content: request.imageDataUrl
            ? [
                { type: "text", text: request.user },
                {
                  type: "image_url",
                  image_url: { url: request.imageDataUrl },
                },
              ]
            : request.user,
        },
      ],
    }),
    signal: withTimeout(request.signal),
  })

  const payload = (await response
    .json()
    .catch(() => null)) as ChatResponse | null

  if (!response.ok) {
    throw new LlmError(
      response.status,
      safeMessage(
        payload?.error?.message ?? `Chat request failed (${response.status})`,
        request.apiKey,
      ),
    )
  }

  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== "string" || content.length === 0) {
    throw new LlmError(response.status, "Model returned an empty response")
  }
  return content
}

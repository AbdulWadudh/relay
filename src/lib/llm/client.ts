/**
 * Minimal OpenAI-compatible chat client (Task 4.3, reused by 4.4).
 *
 * Every provider in the transcription registry speaks this shape, so one
 * client covers all of them. The API key is passed per call and is never
 * logged, never stored on the module, and never included in a thrown
 * error's message (RULES.md / PRD §6: zero plaintext token exposure).
 */

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
      ...(request.json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
    }),
    signal: request.signal,
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

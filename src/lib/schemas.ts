import { z } from "zod"

/**
 * Zod validation schemas (RULES.md: all external input is Zod-validated
 * at the API boundary before touching the database or vault).
 */

export const telemetryEventSchema = z.looseObject({
  event_type: z.enum(["page_load", "client_error", "interaction"]),
  url: z.string().max(2048).optional(),
  user_agent: z.string().max(1024).optional(),
})

export type TelemetryEvent = z.infer<typeof telemetryEventSchema>

export const credentialInputSchema = z.object({
  type: z.enum(["api_key", "oauth"]),
  provider: z.enum(["openai", "groq", "gemini", "notion"]),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresAt: z.number().int().positive().optional(),
  metaData: z.record(z.string(), z.unknown()).optional(),
})

export type CredentialInput = z.infer<typeof credentialInputSchema>

export const agentInputSchema = z.object({
  name: z.string().min(1).max(120),
  systemPrompt: z.string().min(1),
  // JSON Schema object; persisted via the schema's json-mode column.
  expectedOutputSchema: z.record(z.string(), z.unknown()),
  isActive: z.boolean().default(true),
})

export type AgentInput = z.infer<typeof agentInputSchema>

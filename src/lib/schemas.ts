import { z } from "zod"

import { parseSourceUrl, SUPPORTED_SOURCE_LABELS } from "@/lib/media/sources"
import { PROVIDER_IDS } from "@/lib/providers"

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
  provider: z.enum(PROVIDER_IDS),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresAt: z.number().int().positive().optional(),
  metaData: z.record(z.string(), z.unknown()).optional(),
})

export type CredentialInput = z.infer<typeof credentialInputSchema>

/**
 * User-editable credential fields. Every field is optional so the dialog
 * can send only what changed; an empty string clears that field.
 * `account` records which account an API key was generated from, and maps
 * onto the same `account_name` meta key the OAuth flow populates.
 */
export const credentialUpdateSchema = z
  .object({
    label: z.string().trim().max(80).optional(),
    account: z.string().trim().max(120).optional(),
    accessToken: z.string().min(1).optional(),
  })
  .refine(
    (value) =>
      value.label !== undefined ||
      value.account !== undefined ||
      value.accessToken !== undefined,
    { message: "Nothing to update" },
  )

export type CredentialUpdateInput = z.infer<typeof credentialUpdateSchema>

export const agentInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(280),
  systemPrompt: z.string().min(1),
  // JSON Schema object; persisted via the schema's json-mode column.
  expectedOutputSchema: z.record(z.string(), z.unknown()),
  // Free-form agent configuration; persisted via its own json-mode column.
  config: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().default(true),
})

export type AgentInput = z.infer<typeof agentInputSchema>

export const agentUpdateSchema = agentInputSchema.partial()

export type AgentUpdateInput = z.infer<typeof agentUpdateSchema>

/**
 * Pipeline input (TRD §3 `POST /relay/process`). The URL is narrowed to a
 * supported public item by the source registry rather than a regex here,
 * so adding a source never touches this schema.
 */
export const relayProcessSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine((value) => parseSourceUrl(value) !== null, {
      message: `Enter a public ${SUPPORTED_SOURCE_LABELS} link.`,
    }),
  // Optional: falls back to the matching System agent, then to the dynamic
  // schema synthesizer (PRD §4.3).
  agentId: z.string().min(1).max(64).optional(),
})

export type RelayProcessInput = z.infer<typeof relayProcessSchema>

/**
 * Pipeline prompt edit. `content` is the whole prompt — these are short
 * enough that a full replace beats a patch format, and a truncated prompt
 * would silently change how every run behaves.
 */
export const promptUpdateSchema = z.object({
  content: z.string().trim().min(1).max(20_000),
})

export type PromptUpdateInput = z.infer<typeof promptUpdateSchema>

export const rayCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
})

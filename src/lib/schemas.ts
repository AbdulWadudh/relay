import { z } from "zod"
import { ANALYTICS_RANGE_IDS, DEFAULT_RANGE } from "@/lib/analytics/window"
import { CHAT_STAGE_IDS } from "@/lib/extraction/stages"
import { parseSourceUrl, SUPPORTED_SOURCE_LABELS } from "@/lib/media/sources"
import { PROVIDER_IDS } from "@/lib/providers"

/**
 * Zod validation schemas (RULES.md: all external input is Zod-validated
 * at the API boundary before touching the database or vault).
 */

/** The dashboard's only query param. Anything else — an unparseable or
 *  hand-typed range — falls back to the default rather than 400ing, since
 *  a dashboard with no data is a worse answer than a dashboard with the
 *  default window. */
export const analyticsQuerySchema = z.object({
  range: z.enum(ANALYTICS_RANGE_IDS).catch(DEFAULT_RANGE),
})

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>

export const telemetryEventSchema = z.looseObject({
  event_type: z.enum(["page_load", "client_error", "interaction"]),
  url: z.string().max(2048).optional(),
  user_agent: z.string().max(1024).optional(),
})

export type TelemetryEvent = z.infer<typeof telemetryEventSchema>

export const credentialInputSchema = z.object({
  type: z.enum(["api_key", "oauth", "cookie"]),
  provider: z.enum(PROVIDER_IDS),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresAt: z.number().int().positive().optional(),
  metaData: z.record(z.string(), z.unknown()).optional(),
})

export type CredentialInput = z.infer<typeof credentialInputSchema>

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

export const credentialActiveSchema = z.object({ active: z.boolean() })

export const agentInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(280),
  systemPrompt: z.string().min(1),
  expectedOutputSchema: z.record(z.string(), z.unknown()),
  config: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().default(true),
})

export type AgentInput = z.infer<typeof agentInputSchema>

export const agentUpdateSchema = agentInputSchema.partial()

export type AgentUpdateInput = z.infer<typeof agentUpdateSchema>

export const relayProcessSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine((value) => parseSourceUrl(value) !== null, {
      message: `Enter a public ${SUPPORTED_SOURCE_LABELS} link.`,
    }),
  agentId: z.string().min(1).max(64).optional(),
  analysisMode: z.enum(["auto", "vision", "both"]).optional(),
})

export type RelayProcessInput = z.infer<typeof relayProcessSchema>

export const promptUpdateSchema = z.object({
  content: z.string().trim().min(1).max(20_000),
})

export type PromptUpdateInput = z.infer<typeof promptUpdateSchema>

export const shareAutoRunSchema = z.object({ enabled: z.boolean() })

export type ShareAutoRunInput = z.infer<typeof shareAutoRunSchema>

export const extractionChainSchema = z.object({
  stage: z.enum(CHAT_STAGE_IDS),
  chain: z.array(z.string().min(1).max(64)).max(100),
})

export type ExtractionChainInput = z.infer<typeof extractionChainSchema>

/**
 * Pinning a model for one account in one stage. `model: null` unpins.
 *
 * A free string, not an enum: the valid set is the provider's live catalog
 * and no model id is written down in this codebase. `stageModels` drops a
 * pin the catalog no longer lists, so a stale value is inert rather than
 * an error.
 */
export const stageModelSchema = z.object({
  stage: z.enum(CHAT_STAGE_IDS),
  entryId: z.string().min(1).max(64),
  model: z.string().min(1).max(200).nullable(),
})

export type StageModelInput = z.infer<typeof stageModelSchema>

export const cookieImportSchema = z.object({
  cookieJar: z.string().min(1).max(1_000_000),
  label: z.string().trim().max(80).optional(),
  /**
   * The credential this import replaces, set when the wizard was opened
   * from a Vault row's Reconnect action.
   *
   * Needed because `createCredential` dedupes on `meta_data.account_id`
   * and Google exposes no non-secret account id, so a re-imported YouTube
   * session has nothing to match on and would land as a SECOND row beside
   * the dead one. The row the user clicked is the identity the jar itself
   * cannot supply.
   */
  replaces: z.string().min(1).max(64).optional(),
})

export type CookieImportInput = z.infer<typeof cookieImportSchema>

export const rayCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
})

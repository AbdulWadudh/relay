import config from "@/config"
import { catalogFor } from "@/lib/extraction/catalog"
import { resolveChain } from "@/lib/extraction/chain"
import { noImageModelsFor } from "@/lib/extraction/model-refusals"
import { rankModels } from "@/lib/extraction/models"
import { chatProvider } from "@/lib/extraction/providers"
import {
  type ChatStage,
  chatStage,
  taskForStage,
} from "@/lib/extraction/stages"
import { logger } from "@/lib/observability/logger"
import { getStageModels } from "@/lib/settings"
import { accessTokenById } from "@/lib/vault-select"

/**
 * Which model each account in a stage's chain would actually use, and
 * which others it could (human decision 2026-09-04: "I should have the
 * option to select the models, currently there's no way to know which one
 * it uses").
 *
 * The list is the provider's OWN live catalog, ranked by the same
 * `rankModels` the pipeline runs — so what Settings shows is what a run
 * would pick, not a parallel guess. No model id is written down anywhere
 * here, which is what the 2026-09-01 decision actually forbids; a PIN is
 * one user's preference recorded against that catalog.
 */

export interface ModelOption {
  id: string
  free: boolean
  vision: boolean
  contextLength: number
  /** Advertises schema-constrained decoding, which extraction prefers. */
  structured: boolean
}

export interface AccountModels {
  /** Matches `ChainEntry.id` — a credential id, or a keyless provider id. */
  entryId: string
  provider: string
  /** What a run would use right now: the pin if set, else the top rank. */
  using: string | null
  pinned: string | null
  models: ModelOption[]
  /** Set when the catalog could not be read; `models` is then empty. */
  unavailable?: string
}

function toOption(model: {
  id: string
  free: boolean
  vision: boolean
  contextLength: number
  structured: boolean
}): ModelOption {
  return {
    id: model.id,
    free: model.free,
    vision: model.vision,
    contextLength: model.contextLength,
    structured: model.structured,
  }
}

/**
 * Every account in this stage's chain, each with its eligible models.
 *
 * One catalog read per account, which is nearly always a cache hit — the
 * snapshot lives in `model_catalog` for a day and in Redis behind it. A
 * cold provider costs one HTTP call, and a failing one degrades to an
 * `unavailable` row rather than failing the whole page.
 */
export async function stageModels(
  userId: string,
  stage: ChatStage,
): Promise<AccountModels[]> {
  const [chain, pins] = await Promise.all([
    resolveChain(userId, stage),
    getStageModels(userId, stage),
  ])
  const wantsVision = chatStage(stage)?.vision === true
  const task = taskForStage(stage)

  return await Promise.all(
    chain.map(async (entry) => {
      const pinned = pins[entry.id] ?? null
      const base: AccountModels = {
        entryId: entry.id,
        provider: entry.provider,
        using: pinned,
        pinned,
        models: [],
      }

      const provider = chatProvider(entry.provider)
      if (!provider) return { ...base, unavailable: "Provider not available" }

      const apiKey = entry.credentialId
        ? await accessTokenById(entry.credentialId, userId)
        : config.ollama.localApiKey
      if (!apiKey) return { ...base, unavailable: "No key stored" }

      try {
        const catalog = await catalogFor({ userId, provider, apiKey })
        let ranked = rankModels(catalog.models, provider, task, wantsVision)

        // Do not OFFER a model this provider has already refused an image
        // for. Without this the frames tab listed them and a pin could be
        // set on one, which is how `gpt-oss:20b` got pinned to a stage it
        // cannot serve (production, 2026-09-04).
        if (wantsVision) {
          const refused = new Set(
            await noImageModelsFor(userId, entry.provider),
          )
          if (refused.size > 0) {
            ranked = ranked.filter((model) => !refused.has(model.id))
          }
        }
        return {
          ...base,
          models: ranked.map(toOption),
          // The pin only counts while the catalog still lists it: a model
          // withdrawn since it was pinned must not be reported as in use.
          using:
            pinned && ranked.some((model) => model.id === pinned)
              ? pinned
              : (ranked[0]?.id ?? null),
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.warn("Could not list models for an account", {
          stage,
          provider: entry.provider,
          error: message,
        })
        return { ...base, unavailable: "Catalog unavailable" }
      }
    }),
  )
}

/**
 * The pin the pipeline should honour for one account, or null.
 *
 * Read straight from settings rather than through `stageModels`: the
 * pipeline must not spend a catalog read to discover a preference, and
 * `attemptKey` already has the ranked list to validate it against.
 */
export async function pinnedModelsFor(
  userId: string,
  stage: ChatStage,
): Promise<Record<string, string>> {
  return await getStageModels(userId, stage)
}

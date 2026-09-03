import { MODEL_PATHS, type RunFact } from "@/lib/analytics/facts"
import { CHAT_STAGES } from "@/lib/extraction/stages"
import { providerLabel } from "@/lib/providers"

/**
 * Which models did the work, how often, and for which stage.
 *
 * Rows are one per `provider/model` and grouped by provider; the STAGE is
 * what colour encodes, because the grouping already encodes the provider
 * and spending the identity channel on it twice would say nothing new.
 *
 * `unrecorded` names the stages that call a model but write no
 * `{ provider, model }` onto the run — today that is schema synthesis,
 * which records its model on the agent row it creates. Naming them is the
 * point: a stage silently missing from this panel would read as "never
 * used" rather than "never recorded".
 */

export interface StageCount {
  stage: string
  label: string
  count: number
}

export interface ModelUsage {
  key: string
  provider: string
  providerLabel: string
  model: string
  total: number
  byStage: StageCount[]
}

export interface ProviderGroup {
  provider: string
  label: string
  total: number
  models: ModelUsage[]
}

export interface Models {
  groups: ProviderGroup[]
  /** Legend series — only the stages that actually appear. */
  stages: { stage: string; label: string }[]
  unrecorded: string[]
  total: number
}

export function buildModels(facts: RunFact[]): Models {
  interface Bucket {
    provider: string
    model: string
    stages: Map<string, number>
  }
  // Keyed by a joined string but carrying provider and model as fields:
  // a model id is provider-supplied and may contain any character, so
  // splitting the key back apart would risk shearing an id in half.
  const counts = new Map<string, Bucket>()

  for (const fact of facts) {
    for (const use of fact.models) {
      const key = `${use.provider}::${use.model}`
      const bucket = counts.get(key) ?? {
        provider: use.provider,
        model: use.model,
        stages: new Map<string, number>(),
      }
      bucket.stages.set(use.stage, (bucket.stages.get(use.stage) ?? 0) + 1)
      counts.set(key, bucket)
    }
  }

  const seenStages = new Set<string>()
  const rows: ModelUsage[] = [...counts.entries()].map(([key, bucket]) => {
    const byStage = MODEL_PATHS.flatMap((path) => {
      const count = bucket.stages.get(path.stage)
      if (!count) return []
      seenStages.add(path.stage)
      return [{ stage: path.stage, label: path.label, count }]
    })
    return {
      key,
      provider: bucket.provider,
      providerLabel: providerLabel(bucket.provider),
      model: bucket.model,
      total: byStage.reduce((sum, entry) => sum + entry.count, 0),
      byStage,
    }
  })

  const byProvider = new Map<string, ModelUsage[]>()
  for (const row of rows) {
    byProvider.set(row.provider, [...(byProvider.get(row.provider) ?? []), row])
  }

  const groups = [...byProvider.entries()]
    .map(([provider, models]) => ({
      provider,
      label: providerLabel(provider),
      total: models.reduce((sum, row) => sum + row.total, 0),
      models: models.sort(
        (a, b) => b.total - a.total || a.model.localeCompare(b.model),
      ),
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))

  return {
    groups,
    // MODEL_PATHS order, so the legend and every stacked row agree and the
    // colour a stage wears never depends on which models are on screen.
    stages: MODEL_PATHS.filter((path) => seenStages.has(path.stage)).map(
      (path) => ({ stage: path.stage, label: path.label }),
    ),
    unrecorded: CHAT_STAGES.filter(
      (stage) => stage.additionalDataKey === null,
    ).map((stage) => stage.label),
    total: rows.reduce((sum, row) => sum + row.total, 0),
  }
}

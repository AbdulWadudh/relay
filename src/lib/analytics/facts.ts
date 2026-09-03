import { and, eq, gte, lte, sql } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { type AnalysisMode, type RunStatus, relayRuns } from "@/lib/db/schema"
import { CHAT_STAGES } from "@/lib/extraction/stages"

/**
 * The ONE read the run-derived panels share.
 *
 * `additional_data` and `result` hold whole yt-dlp payloads, both
 * transcripts, the frame segments and every verification finding —
 * hundreds of KB per run. In production the database is Turso, across the
 * network, so `select *` would drag megabytes back to compute a handful of
 * counters. Every field below is projected with `json_extract` instead, so
 * one round trip returns ~12 small columns per run and the folds in the
 * sibling modules are pure functions over that.
 */

/** Every place the pipeline records a `{ provider, model }` pair. */
export interface ModelPath {
  stage: string
  label: string
  providerPath: string
  modelPath: string
}

export const MODEL_PATHS: ModelPath[] = [
  // Chat stages come from the registry, so a stage added there appears in
  // the dashboard without a second list to keep in sync. The ones with no
  // `additionalDataKey` record nothing on the run and are dropped.
  ...CHAT_STAGES.filter((stage) => stage.additionalDataKey !== null).map(
    (stage) => ({
      stage: stage.id as string,
      label: stage.label,
      providerPath: `$.${stage.additionalDataKey}.provider`,
      modelPath: `$.${stage.additionalDataKey}.model`,
    }),
  ),
  // Transcription is not a ChatStage — it calls a speech model, not a chat
  // model — but it is a stage that burns a provider, so it belongs here.
  {
    stage: "transcription",
    label: "Transcription",
    providerPath: "$.transcript.provider",
    modelPath: "$.transcript.audio_model",
  },
]

export interface StageModel {
  stage: string
  label: string
  provider: string
  model: string
}

export interface RunFact {
  id: string
  status: RunStatus
  source: string
  analysisMode: AnalysisMode
  agentId: string | null
  createdAt: number
  updatedAt: number
  timings: Record<string, number>
  errorCode: string | null
  failedStage: string | null
  permanent: boolean
  models: StageModel[]
  /** "speech" | "frames" — which text the run actually read. */
  analysisSources: string[]
  /** The Ray this run published through, when it got that far. */
  publishProvider: string | null
  /** The agent's name as the router recorded it. Survives the agent being
   *  deleted, which the `agents` join does not. */
  agentName: string | null
  evidence: { extracted: number; verified: number; flagged: number } | null
}

function json(path: string) {
  return sql<string | null>`json_extract(${relayRuns.additionalData}, ${path})`
}

function num(column: typeof relayRuns.result, path: string) {
  return sql<number | null>`json_extract(${column}, ${path})`
}

const MODEL_COLUMN = sql<string>`json_array(${sql.join(
  MODEL_PATHS.flatMap((path) => [
    json(path.providerPath),
    json(path.modelPath),
  ]),
  sql`, `,
)})`

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

/** Pairs the flattened `[provider, model, provider, model, ...]` array back
 *  onto MODEL_PATHS by position; a stage the run never reached is null on
 *  both and drops out. */
function modelsFrom(raw: string): StageModel[] {
  let flat: unknown[]
  try {
    flat = JSON.parse(raw) as unknown[]
  } catch {
    return []
  }
  return MODEL_PATHS.flatMap((path, index) => {
    const provider = str(flat[index * 2])
    const model = str(flat[index * 2 + 1])
    return provider && model
      ? [{ stage: path.stage, label: path.label, provider, model }]
      : []
  })
}

function sourcesFrom(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : []
  } catch {
    return []
  }
}

export async function fetchRunFacts(
  userId: string,
  from: number | null,
  to: number,
): Promise<RunFact[]> {
  const rows = await getDb()
    .select({
      id: relayRuns.id,
      status: relayRuns.status,
      source: relayRuns.source,
      analysisMode: relayRuns.analysisMode,
      agentId: relayRuns.agentId,
      createdAt: relayRuns.createdAt,
      updatedAt: relayRuns.updatedAt,
      timings: relayRuns.timings,
      errorCode: json("$.error_code"),
      failedStage: json("$.failed_stage"),
      permanent: sql<
        number | null
      >`json_extract(${relayRuns.additionalData}, '$.permanent')`,
      analysisSources: json("$.analysis.sources"),
      publishProvider: json("$.publish.provider"),
      agentName: json("$.routing.agent_name"),
      models: MODEL_COLUMN,
      extracted: num(relayRuns.result, "$.verification.extracted"),
      verified: num(relayRuns.result, "$.verification.verified"),
      flagged: num(relayRuns.result, "$.verification.flagged"),
    })
    .from(relayRuns)
    .where(
      and(
        eq(relayRuns.userId, userId),
        from === null ? undefined : gte(relayRuns.createdAt, from),
        lte(relayRuns.createdAt, to),
      ),
    )
    .all()

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    source: row.source,
    analysisMode: row.analysisMode,
    agentId: row.agentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    timings: row.timings ?? {},
    errorCode: str(row.errorCode),
    failedStage: str(row.failedStage),
    permanent: row.permanent === 1,
    models: modelsFrom(row.models),
    analysisSources: sourcesFrom(row.analysisSources),
    publishProvider: str(row.publishProvider),
    agentName: str(row.agentName),
    evidence:
      typeof row.extracted === "number"
        ? {
            extracted: row.extracted,
            verified: row.verified ?? 0,
            flagged: row.flagged ?? 0,
          }
        : null,
  }))
}

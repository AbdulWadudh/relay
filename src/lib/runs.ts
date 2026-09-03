import { and, count, desc, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { type AnalysisMode, type RunStatus, relayRuns } from "@/lib/db/schema"
import { parseSourceUrl, sourceLabel } from "@/lib/media/sources"

// Status labels/terminal checks live in src/lib/run-status.ts, which is
// import-safe from client components (this module is not — it opens the db).

/**
 * Run service (Task 4.2). The durable record behind the Queue page and the
 * BullMQ job — see src/lib/queue/runs-queue.ts for why this table, not the
 * queue, is the source of truth for a run's state.
 */

export interface RunSummary {
  id: string
  sourceUrl: string
  source: string
  sourceLabel: string
  title: string | null
  agentId: string | null
  analysisMode: AnalysisMode
  status: RunStatus
  error: string | null
  timings: Record<string, number>
  result: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
}

function toSummary(row: typeof relayRuns.$inferSelect): RunSummary {
  // Ingest stores yt-dlp's metadata under additional_data.source_info; the
  // title is the one field the list actually renders, so it's lifted here
  // rather than shipping the whole blob to the browser.
  const info = row.additionalData?.source_info as
    | Record<string, unknown>
    | undefined
  return {
    id: row.id,
    sourceUrl: row.sourceUrl,
    source: row.source,
    sourceLabel: sourceLabel(row.source),
    title: typeof info?.title === "string" ? info.title : null,
    agentId: row.agentId,
    analysisMode: row.analysisMode,
    status: row.status,
    error: row.error,
    timings: row.timings,
    result: row.result,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export interface RunDetail extends RunSummary {
  additionalData: Record<string, unknown>
}

function toDetail(row: typeof relayRuns.$inferSelect): RunDetail {
  return { ...toSummary(row), additionalData: row.additionalData ?? {} }
}

export const RUNS_PER_PAGE = 20

export interface RunPage {
  runs: RunSummary[]
  total: number
  page: number
  perPage: number
}

export async function listRuns(
  userId: string,
  page = 1,
  perPage = RUNS_PER_PAGE,
): Promise<RunPage> {
  const db = getDb()
  const scope = eq(relayRuns.userId, userId)

  const counted = await db
    .select({ total: count() })
    .from(relayRuns)
    .where(scope)
    .get()
  const total = counted?.total ?? 0

  const pages = Math.max(1, Math.ceil(total / perPage))
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pages)

  const rows = await db
    .select()
    .from(relayRuns)
    .where(scope)
    .orderBy(desc(relayRuns.createdAt))
    .limit(perPage)
    .offset((current - 1) * perPage)
    .all()

  return { runs: rows.map(toSummary), total, page: current, perPage }
}

export async function getRun(
  id: string,
  userId: string,
): Promise<RunDetail | null> {
  const row = await getDb()
    .select()
    .from(relayRuns)
    .where(and(eq(relayRuns.id, id), eq(relayRuns.userId, userId)))
    .get()
  return row ? toDetail(row) : null
}

export async function createRun(
  input: { url: string; agentId?: string; analysisMode?: AnalysisMode },
  userId: string,
): Promise<RunSummary> {
  const parsed = parseSourceUrl(input.url)
  if (!parsed) {
    throw new Error("Unsupported source URL")
  }
  const now = Date.now()
  const [row] = await getDb()
    .insert(relayRuns)
    .values({
      id: crypto.randomUUID(),
      userId,
      sourceUrl: parsed.canonicalUrl,
      source: parsed.source,
      agentId: input.agentId ?? null,
      analysisMode: input.analysisMode ?? "auto",
      status: "queued",
      timings: {},
      additionalData: {
        // Everything the source registry derived, kept verbatim so the
        // parse can be audited later (user's requirement: nothing
        // generated during a run is thrown away).
        submitted_url: input.url,
        source_item_id: parsed.itemId,
      },
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .all()
  return toSummary(row)
}

export interface RunPatch {
  status?: RunStatus
  error?: string | null
  agentId?: string | null
  result?: Record<string, unknown> | null
  timings?: Record<string, number>
  additionalData?: Record<string, unknown>
}

export async function updateRun(
  id: string,
  patch: RunPatch,
): Promise<RunSummary | null> {
  const db = getDb()
  const current = await db
    .select()
    .from(relayRuns)
    .where(eq(relayRuns.id, id))
    .get()
  if (!current) return null

  const [row] = await db
    .update(relayRuns)
    .set({
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.error !== undefined ? { error: patch.error } : {}),
      ...(patch.agentId !== undefined ? { agentId: patch.agentId } : {}),
      ...(patch.result !== undefined ? { result: patch.result } : {}),
      ...(patch.timings
        ? { timings: { ...current.timings, ...patch.timings } }
        : {}),
      ...(patch.additionalData
        ? {
            additionalData: {
              ...current.additionalData,
              ...patch.additionalData,
            },
          }
        : {}),
      updatedAt: Date.now(),
    })
    .where(eq(relayRuns.id, id))
    .returning()
    .all()
  return row ? toSummary(row) : null
}

/** Row the worker needs to actually run the pipeline (no user scoping). */
export async function getRunForWorker(
  id: string,
): Promise<typeof relayRuns.$inferSelect | null> {
  const row = await getDb()
    .select()
    .from(relayRuns)
    .where(eq(relayRuns.id, id))
    .get()
  return row ?? null
}

export async function deleteRun(id: string, userId: string): Promise<boolean> {
  const deleted = await getDb()
    .delete(relayRuns)
    .where(and(eq(relayRuns.id, id), eq(relayRuns.userId, userId)))
    .returning({ id: relayRuns.id })
    .all()
  return deleted.length > 0
}

import { Hono } from "hono"

import { logger } from "@/lib/observability/logger"
import { dropRunLogs, readRunLogs } from "@/lib/observability/run-logs"
import { readRunLogsHistory } from "@/lib/observability/run-logs-history"
import { enqueueRun } from "@/lib/queue/runs-queue"
import { createRun, deleteRun, getRun, listRuns, updateRun } from "@/lib/runs"
import { relayProcessSchema } from "@/lib/schemas"
import { requireSession, type SessionEnv } from "@/server/require-session"

/**
 * /api/v1/runs + /api/v1/relay/process (TRD §3, Task 4.2).
 *
 * `process` never executes the pipeline — it persists a `queued` run and
 * hands it to BullMQ, so the request returns in milliseconds regardless of
 * how long the run takes.
 */

export const runsModule = new Hono<SessionEnv>()
runsModule.use("*", requireSession)

runsModule.get("/", async (c) => {
  const session = c.get("session")
  // The page object IS the response body — `{ runs, total, page, perPage }`
  // rather than nested under a `runs` key, so the client reads the counts
  // it needs to size the pager without a second call.
  //
  // Unparseable or absent becomes page 1; `listRuns` clamps the rest, so a
  // hand-typed `?page=99` serves the last real page instead of nothing.
  const requested = Number.parseInt(c.req.query("page") ?? "1", 10)
  return c.json(
    await listRuns(session.user.id, Number.isNaN(requested) ? 1 : requested),
  )
})

runsModule.get("/:id", async (c) => {
  const session = c.get("session")
  // Returns the full detail shape (including additional_data) — the list
  // endpoint stays lean, this one is what the detail page reads.
  const run = await getRun(c.req.param("id"), session.user.id)
  if (!run) return c.json({ error: "Run not found" }, 404)
  return c.json({ run })
})

/**
 * The run's log stream, for the stage rail on the detail page.
 *
 * OWNERSHIP IS CHECKED VIA `getRun` FIRST, and that is not incidental: the
 * logs live in Dragonfly and OpenObserve, keyed only by run id, with no
 * user column to filter on. Without this lookup any signed-in user could
 * read any other user's run logs by guessing an id.
 *
 * Live logs come from Dragonfly; when its TTL has passed, the same lines
 * are read back out of OpenObserve. `source` tells the UI which it got, so
 * an empty result can say WHY it is empty rather than implying the run
 * produced nothing.
 */
runsModule.get("/:id/logs", async (c) => {
  const session = c.get("session")
  const id = c.req.param("id")
  if (!(await getRun(id, session.user.id))) {
    return c.json({ error: "Run not found" }, 404)
  }

  const live = await readRunLogs(id)
  if (live.length > 0) return c.json({ lines: live, source: "live" })

  const history = await readRunLogsHistory(id)
  return c.json({ lines: history, source: "history" })
})

runsModule.delete("/:id", async (c) => {
  const session = c.get("session")
  const id = c.req.param("id")
  if (!(await deleteRun(id, session.user.id))) {
    return c.json({ error: "Run not found" }, 404)
  }
  // A deleted run takes its logs with it rather than leaving them to sit
  // out the TTL, addressable by anyone who kept the id.
  dropRunLogs(id)
  logger.info("Run deleted", { run_id: id })
  return c.json({ ok: true })
})

export const relayModule = new Hono<SessionEnv>()
relayModule.use("*", requireSession)

relayModule.post("/process", async (c) => {
  const session = c.get("session")

  const body = await c.req.json().catch(() => null)
  const parsed = relayProcessSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: "Invalid pipeline payload", issues: parsed.error.issues },
      400,
    )
  }

  const run = await createRun(parsed.data, session.user.id)

  try {
    await enqueueRun({ runId: run.id, userId: session.user.id })
  } catch (error) {
    // The row exists but nothing will ever pick it up, so fail it now
    // rather than leaving a run stuck on "queued" forever.
    const message = error instanceof Error ? error.message : String(error)
    logger.error("Run enqueue failed", { run_id: run.id, error: message })
    const failed = await updateRun(run.id, {
      status: "failed",
      error:
        "Couldn't reach the job queue. Check that the queue service is running.",
      additionalData: { error_code: "ENQUEUE_FAILED", enqueue_error: message },
    })
    return c.json({ run: failed ?? run, error: "Queue unavailable" }, 503)
  }

  logger.info("Run queued", { run_id: run.id, source: run.source })
  return c.json({ run }, 202)
})

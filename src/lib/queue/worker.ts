import { Worker } from "bullmq"

import config from "@/config"
import { logger } from "@/lib/observability/logger"
import { processRun } from "@/lib/pipeline"
import { createRedis } from "@/lib/queue/connection"
import type { RunJobData } from "@/lib/queue/runs-queue"

/**
 * The run worker (Task 4.2). Runs in its own process — see scripts/worker.ts
 * and the `worker` service in docker-compose.yml — so a long pipeline never
 * occupies a request handler.
 *
 * A dedicated connection (not the API's shared one) because a Worker holds
 * blocking commands open on its socket.
 */

export function startRunWorker(): Worker<RunJobData> {
  const worker = new Worker<RunJobData>(
    config.queue.name,
    async (job) => {
      await processRun(job.data.runId)
    },
    {
      connection: createRedis(),
      concurrency: config.queue.concurrency,
      // Same hash-tagged prefix as the queue (see src/config).
      prefix: config.queue.prefix,
    },
  )

  worker.on("completed", (job) => {
    logger.info("Run job completed", { run_id: job.data.runId, job_id: job.id })
  })

  worker.on("failed", (job, error) => {
    // processRun already wrote the failure to the run row; this is the
    // queue-side record, including which attempt burned.
    logger.error("Run job failed", {
      run_id: job?.data.runId,
      job_id: job?.id,
      attempts_made: job?.attemptsMade,
      error: error.message,
    })
  })

  worker.on("error", (error) => {
    // Connection-level problems — Dragonfly down, auth rejected. These
    // don't belong to any one job.
    logger.error("Run worker error", { error: error.message })
  })

  logger.info("Run worker started", {
    queue: config.queue.name,
    concurrency: config.queue.concurrency,
  })
  return worker
}

/**
 * Finishes in-flight jobs before exiting so a deploy doesn't strand a run
 * mid-download with its temp directory still on disk.
 */
export function installShutdownHandlers(worker: Worker<RunJobData>): void {
  let closing = false
  const shutdown = async (signal: string) => {
    if (closing) return
    closing = true
    logger.info("Run worker shutting down", { signal })
    await worker.close()
    process.exit(0)
  }
  process.on("SIGTERM", () => void shutdown("SIGTERM"))
  process.on("SIGINT", () => void shutdown("SIGINT"))
}

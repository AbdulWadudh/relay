import { Queue } from "bullmq"

import config from "@/config"
import { getRedis } from "@/lib/queue/connection"

/**
 * The run queue (Task 4.2). `POST /relay/process` writes a `queued` row and
 * enqueues here, then returns immediately — the HTTP request never waits on
 * a download, a Whisper call, or an LLM call.
 *
 * The job payload is deliberately just an id pair: `relay_runs` is the
 * source of truth for a run's state, so a flushed Dragonfly loses pending
 * *scheduling*, never history, and a job can never carry a stale copy of
 * the run.
 */

export interface RunJobData {
  runId: string
  userId: string
}

const globalForQueue = globalThis as unknown as {
  __relayRunsQueue?: Queue<RunJobData>
}

export function getRunsQueue(): Queue<RunJobData> {
  globalForQueue.__relayRunsQueue ??= new Queue<RunJobData>(config.queue.name, {
    connection: getRedis(),
    // Must match the worker's prefix exactly or the two never meet.
    prefix: config.queue.prefix,
    defaultJobOptions: {
      attempts: config.queue.attempts,
      backoff: { type: "exponential", delay: config.queue.backoffMs },
      // Keep a bounded tail in Redis for debugging; `relay_runs` holds the
      // durable history, so nothing is lost when these are trimmed.
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  })
  return globalForQueue.__relayRunsQueue
}

/** Throws if the queue is unreachable, so the caller can fail the run. */
export async function enqueueRun(data: RunJobData): Promise<string> {
  const job = await getRunsQueue().add("process", data, { jobId: data.runId })
  return job.id ?? data.runId
}

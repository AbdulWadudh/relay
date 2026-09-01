import type { Worker } from "bullmq"

import config from "@/config"
import { logger } from "@/lib/observability/logger"

/**
 * Liveness endpoint for the worker container.
 *
 * The worker serves no traffic, so without this Docker — and therefore
 * Coolify's dashboard — can only report that the process exists. That is
 * still true after BullMQ stops consuming because its Dragonfly connection
 * died, which is exactly the failure worth seeing. `worker.isRunning()` is
 * the state that matters, so it is what gets reported.
 *
 * Bound to loopback and never published: the container's own healthcheck is
 * the only caller.
 */
export function startWorkerHealthServer(worker: Worker): void {
  const server = Bun.serve({
    port: config.queue.healthPort,
    hostname: "127.0.0.1",
    fetch() {
      const running = worker.isRunning()
      return Response.json(
        {
          status: running ? "ok" : "stopped",
          queue: config.queue.name,
          concurrency: config.queue.concurrency,
        },
        { status: running ? 200 : 503 },
      )
    },
  })

  logger.info("Worker health server listening", { port: server.port })
}

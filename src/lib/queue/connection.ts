import IORedis from "ioredis"

import config from "@/config"
import { logger } from "@/lib/observability/logger"

/**
 * Redis/Dragonfly connections for BullMQ (Task 4.2).
 *
 * `maxRetriesPerRequest: null` is required by BullMQ: a Worker blocks on
 * Redis indefinitely, and ioredis's default retry cap turns a brief outage
 * into a thrown exception that kills the worker instead of a reconnect.
 */

export function createRedis(
  options: { enableOfflineQueue?: boolean } = {},
): IORedis {
  const client = new IORedis(config.queue.url, {
    maxRetriesPerRequest: null,
    // The API process should surface a dead queue as a failed enqueue
    // rather than buffering writes that silently never land.
    //
    // Capture tickets opt OUT of that (see src/lib/capture/tickets.ts): the
    // client connects lazily, so the FIRST command after a process start
    // would otherwise throw "Stream isn't writeable" before the socket is
    // ready — which made the first sign-in after every deploy fail. A
    // ticket read is not a job enqueue; waiting a few ms beats failing.
    enableOfflineQueue: options.enableOfflineQueue ?? false,
  })

  // NOT COSMETIC — this listener is what keeps the process alive.
  //
  // An ioredis client is an EventEmitter, and an EventEmitter that emits
  // `error` with NO listener THROWS, which in a server takes the whole
  // process down. ioredis emits `error` on every ordinary connection blip
  // (ECONNREFUSED while Dragonfly restarts, ECONNRESET, a dropped socket)
  // and then reconnects by itself, so the only thing the missing listener
  // ever bought was turning a recoverable blip into a dead container.
  //
  // Attached HERE rather than at each call site so it cannot be forgotten:
  // every client in the codebase is built by this function, and only the
  // BullMQ Worker used to register one of its own.
  client.on("error", (error: Error) => {
    logger.error("Redis connection error", { error: error.message })
  })
  return client
}

// Cached on globalThis so Next.js dev-mode HMR doesn't leak a socket per
// reload, matching the pattern in src/lib/db/index.ts.
const globalForRedis = globalThis as unknown as { __relayRedis?: IORedis }

export function getRedis(): IORedis {
  globalForRedis.__relayRedis ??= createRedis()
  return globalForRedis.__relayRedis
}

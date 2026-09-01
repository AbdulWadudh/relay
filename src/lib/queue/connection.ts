import IORedis from "ioredis"

import config from "@/config"

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
  return new IORedis(config.queue.url, {
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
}

// Cached on globalThis so Next.js dev-mode HMR doesn't leak a socket per
// reload, matching the pattern in src/lib/db/index.ts.
const globalForRedis = globalThis as unknown as { __relayRedis?: IORedis }

export function getRedis(): IORedis {
  globalForRedis.__relayRedis ??= createRedis()
  return globalForRedis.__relayRedis
}

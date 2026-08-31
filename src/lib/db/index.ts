import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"

import config from "@/config"

import * as schema from "./schema"

/**
 * Drizzle ORM over libSQL (TRD §2, RULES.md). `config.database.url` is either
 * a local `file:` path (dev) or a remote `libsql://` Turso URL (production),
 * both handled by the same @libsql/client connection.
 *
 * Migrations are applied via the explicit `bun run db:migrate` step (the
 * Dockerfile CMD runs it before `next start`), not automatically here:
 * libsql's migrator is async, but getDb() is called synchronously all over
 * the codebase (e.g. vault.ts's listCredentials/deleteCredential), and
 * running it per-connection also meant every Next.js build worker importing
 * this module raced to migrate the same database in parallel.
 */

function createDb() {
  const client = createClient({
    url: config.database.url,
    authToken: config.database.authToken,
  })
  return drizzle(client, { schema })
}

export type RelayDb = ReturnType<typeof createDb>

// Cache on globalThis so Next.js dev-mode HMR doesn't leak connections.
const globalForDb = globalThis as unknown as { __relayDrizzle?: RelayDb }

export function getDb(): RelayDb {
  globalForDb.__relayDrizzle ??= createDb()
  return globalForDb.__relayDrizzle
}

export { schema }

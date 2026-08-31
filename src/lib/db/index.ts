import type { Client, createClient as createClientType } from "@libsql/client"
import type { LibSQLDatabase } from "drizzle-orm/libsql"

import config from "@/config"

import * as schema from "./schema"

// require (not a static import) with turbopackIgnore so Turbopack leaves this
// call untouched instead of routing it through its dev-mode external-module
// wrapper, which has a known bug resolving @libsql/client's native bindings
// ("Failed to load external module @libsql/client-<hash>"). Production
// builds/next start were never affected — this only works around next dev.
const { createClient } = require(/* turbopackIgnore: true */ "@libsql/client") as {
  createClient: typeof createClientType
}

// drizzle-orm/libsql's own driver.js re-imports @libsql/client statically too
// (for its createClient(url)/createClient(config) overloads, which we never
// use — we always pass a pre-built client), which trips the same Turbopack
// bug regardless of the workaround above, since that import lives inside
// drizzle-orm's own package and can't be annotated. driver-core.js has the
// same construct() logic driver.js delegates to for the "already have a
// client" case, minus that import, so importing it directly sidesteps the
// bug entirely instead of merely working around our own call site.
const { construct } = require("drizzle-orm/libsql/driver-core") as {
  construct: (
    client: Client,
    config?: { schema?: typeof schema },
  ) => LibSQLDatabase<typeof schema>
}

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
  return construct(client, { schema })
}

export type RelayDb = ReturnType<typeof createDb>

// Cache on globalThis so Next.js dev-mode HMR doesn't leak connections.
const globalForDb = globalThis as unknown as { __relayDrizzle?: RelayDb }

export function getDb(): RelayDb {
  globalForDb.__relayDrizzle ??= createDb()
  return globalForDb.__relayDrizzle
}

export { schema }

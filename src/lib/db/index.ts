import { Database } from "bun:sqlite"
// node:fs / node:path are Bun's own native implementations (RULES.md §Bun-first):
// Bun ships no separate synchronous mkdir/dirname API.
import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"

import config from "@/config"

import * as schema from "./schema"

/**
 * Drizzle ORM over Bun native `bun:sqlite` (TRD §2, RULES.md).
 * Connection string comes from config.database.url; migrations generated
 * by drizzle-kit (`bun run db:generate`) are applied on first connection.
 */

function createDb() {
  // bun:sqlite opens plain file paths; config.database.url is a file: URL.
  const path = resolve(config.database.url.replace(/^file:/, ""))
  mkdirSync(dirname(path), { recursive: true })
  const sqlite = new Database(path, { create: true })
  sqlite.exec("PRAGMA journal_mode = WAL;")
  sqlite.exec("PRAGMA foreign_keys = ON;")
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: "./drizzle" })
  return db
}

export type RelayDb = ReturnType<typeof createDb>

// Cache on globalThis so Next.js dev-mode HMR doesn't leak connections.
const globalForDb = globalThis as unknown as { __relayDb?: RelayDb }

export function getDb(): RelayDb {
  globalForDb.__relayDb ??= createDb()
  return globalForDb.__relayDb
}

export { schema }

import { Database } from "bun:sqlite"
import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"

/**
 * Bun native SQLite database (TRD §2).
 *
 * Hybrid credential storage: `access_token` / `refresh_token` are
 * AES-256-GCM encrypted (see lib/crypto.ts), `meta_data` stays plaintext
 * JSON so workspace/bot metadata remains queryable without decryption.
 *
 * Requires the Bun runtime — scripts run Next via `bun --bun`.
 */

const SCHEMA = /* sql */ `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK(type IN ('api_key', 'oauth')) NOT NULL,
  provider TEXT NOT NULL, -- 'openai', 'groq', 'gemini', 'notion'
  access_token TEXT NOT NULL, -- AES-256-GCM encrypted
  refresh_token TEXT, -- AES-256-GCM encrypted, nullable
  expires_at INTEGER, -- Unix timestamp in ms, nullable
  meta_data TEXT, -- Plaintext JSON (workspace_id, bot_id, scopes, ...)
  iv TEXT NOT NULL, -- Unique AES-256-GCM initialization vector
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credentials_user_provider ON credentials(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_credentials_expires_at ON credentials(expires_at);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK(type IN ('system', 'human')) NOT NULL,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  expected_output_schema TEXT NOT NULL, -- JSON Schema string
  is_active INTEGER DEFAULT 1 NOT NULL,
  created_at INTEGER NOT NULL
);
`

function createDatabase(): Database {
  const path = resolve(process.env.RELAY_DB_PATH ?? "./data/relay.db")
  mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path, { create: true })
  db.exec("PRAGMA journal_mode = WAL;")
  db.exec("PRAGMA foreign_keys = ON;")
  db.exec(SCHEMA)
  return db
}

// Cache on globalThis so Next.js dev-mode HMR doesn't leak connections.
const globalForDb = globalThis as unknown as { __relayDb?: Database }

export function getDb(): Database {
  globalForDb.__relayDb ??= createDatabase()
  return globalForDb.__relayDb
}

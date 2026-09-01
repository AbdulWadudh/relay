import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

import { authUsers } from "@/lib/db/schema"

/**
 * Task 4.4's tables — the pipeline's editable prompts and the cached
 * provider model catalogs. Split out of schema.ts purely to respect the
 * 250-line cap (RULES.md); schema.ts re-exports everything here, so both
 * Drizzle and drizzle-kit still see one schema surface.
 */

/**
 * Pipeline prompts (Task 4.4, human decision 2026-09-01: EVERY prompt
 * lives in the database, none are string constants in the source).
 *
 * Agent prompts already live in `agents.system_prompt`; these are the
 * pipeline's own — the evidence contract, the agent router, the schema
 * synthesizer — which apply across every agent. Seeded per user and
 * idempotent, the same way System agents are, so a user can tune them
 * without a deploy. `version` bumps on every write and is what the Redis
 * cache is invalidated against.
 */
export const prompts = sqliteTable(
  "prompts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    // Stable identifier the pipeline looks a prompt up by; renaming the
    // human-facing `name` never breaks a lookup.
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    content: text("content").notNull(),
    // Bumped on every write, so a cached copy can be compared cheaply.
    version: integer("version").notNull().default(1),
    additionalData: text("additional_data", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [uniqueIndex("idx_prompts_user_key").on(table.userId, table.key)],
)

/**
 * Cached provider model catalogs (Task 4.4, human decision 2026-09-01:
 * model ids are NEVER hardcoded).
 *
 * Every provider's catalog churns — OpenRouter's free pool turns over
 * daily — so the extraction stage discovers what is available from the
 * provider's own `/models` endpoint and ranks it by advertised capability.
 * This table is the cache between those fetches, shared by the web and
 * worker processes (an in-process Map would be neither).
 *
 * Per user, because a provider's catalog is scoped to the key that reads
 * it. `credential_updated_at` snapshots the credential's `updated_at` at
 * fetch time: rotating a key changes what it can reach, so a mismatch
 * invalidates the entry just as an expired TTL does.
 */
export const modelCatalog = sqliteTable(
  "model_catalog",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    // Normalised capability rows. Typed loosely here so the schema stays
    // free of imports from the extraction layer, which imports this file.
    models: text("models", { mode: "json" })
      .$type<Record<string, unknown>[]>()
      .notNull()
      .default([]),
    credentialUpdatedAt: integer("credential_updated_at").notNull().default(0),
    fetchedAt: integer("fetched_at").notNull(),
    additionalData: text("additional_data", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
  },
  (table) => [
    uniqueIndex("idx_model_catalog_user_provider").on(
      table.userId,
      table.provider,
    ),
  ],
)

/**
 * Per-user preferences (human decision 2026-09-01).
 *
 * A narrow key/value store rather than a column per preference: these are
 * read one at a time by key, never queried across, and a new preference
 * should not cost a migration. `value` is json-mode TEXT so each key owns
 * its own shape, validated by that key's Zod schema at the API boundary
 * rather than by the column.
 *
 * NOTHING SECRET GOES HERE — it is plaintext, exactly like `meta_data`.
 * Secrets belong in `credentials`, encrypted.
 */
export const userSettings = sqliteTable(
  "user_settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    // Stable lookup key (e.g. "extraction_order"). One row per user+key.
    key: text("key").notNull(),
    value: text("value", { mode: "json" }).$type<unknown>().notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_user_settings_user_key").on(table.userId, table.key),
  ],
)

export type ModelCatalog = typeof modelCatalog.$inferSelect
export type NewModelCatalog = typeof modelCatalog.$inferInsert
export type Prompt = typeof prompts.$inferSelect
export type NewPrompt = typeof prompts.$inferInsert
export type UserSetting = typeof userSettings.$inferSelect
export type NewUserSetting = typeof userSettings.$inferInsert

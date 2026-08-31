import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

/**
 * Drizzle schema (TRD §2).
 *
 * Hybrid credentials vault: `access_token` / `refresh_token` are stored
 * AES-256-GCM encrypted (src/lib/crypto.ts) with the record's unique `iv`;
 * `meta_data` stays plaintext JSON so workspace/bot metadata is queryable
 * without decryption.
 */

export const authUsers = sqliteTable("auth_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default("Relay User"),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull().default(0),
})

export const credentials = sqliteTable(
  "credentials",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["api_key", "oauth"] }).notNull(),
    provider: text("provider").notNull(), // 'openai', 'groq', 'gemini', 'notion'
    accessToken: text("access_token").notNull(), // AES-256-GCM encrypted
    refreshToken: text("refresh_token"), // AES-256-GCM encrypted, nullable
    expiresAt: integer("expires_at"), // Unix timestamp in ms, nullable
    // Plaintext JSON (workspace_id, bot_id, scopes, ...) — TEXT on disk,
    // auto parse/stringify + typing via Drizzle json mode.
    metaData: text("meta_data", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    iv: text("iv").notNull(), // Unique AES-256-GCM initialization vector
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    index("idx_credentials_user_provider").on(t.userId, t.provider),
    index("idx_credentials_expires_at").on(t.expiresAt),
  ],
)

export const agents = sqliteTable(
  "agents",
  {
    id: text("id").primaryKey(),
    // This is the Better Auth users.id value. Agents and credentials share
    // the same ownership boundary and are deleted with the user.
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["system", "human"] }).notNull(),
    name: text("name").notNull(),
    systemPrompt: text("system_prompt").notNull(),
    // JSON Schema object — TEXT on disk via Drizzle json mode.
    expectedOutputSchema: text("expected_output_schema", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    isActive: integer("is_active").default(1).notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_agents_user_id").on(table.userId)],
)

export const authSessions = sqliteTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_auth_sessions_user_id").on(table.userId)],
)

export const authAccounts = sqliteTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    issuer: text("issuer").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("idx_auth_accounts_user_id").on(table.userId),
    index("idx_auth_accounts_provider_account").on(
      table.providerId,
      table.accountId,
    ),
  ],
)

export const authVerifications = sqliteTable(
  "auth_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_auth_verifications_identifier").on(table.identifier)],
)

export type User = typeof authUsers.$inferSelect
export type NewUser = typeof authUsers.$inferInsert
export type Credential = typeof credentials.$inferSelect
export type NewCredential = typeof credentials.$inferInsert
export type Agent = typeof agents.$inferSelect
export type NewAgent = typeof agents.$inferInsert

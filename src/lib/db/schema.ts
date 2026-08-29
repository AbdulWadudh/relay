import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

/**
 * Drizzle schema (TRD §2).
 *
 * Hybrid credentials vault: `access_token` / `refresh_token` are stored
 * AES-256-GCM encrypted (src/lib/crypto.ts) with the record's unique `iv`;
 * `meta_data` stays plaintext JSON so workspace/bot metadata is queryable
 * without decryption.
 */

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at").notNull(),
})

export const credentials = sqliteTable(
  "credentials",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["api_key", "oauth"] }).notNull(),
    provider: text("provider").notNull(), // 'openai', 'groq', 'gemini', 'notion'
    accessToken: text("access_token").notNull(), // AES-256-GCM encrypted
    refreshToken: text("refresh_token"), // AES-256-GCM encrypted, nullable
    expiresAt: integer("expires_at"), // Unix timestamp in ms, nullable
    metaData: text("meta_data"), // Plaintext JSON (workspace_id, bot_id, scopes, ...)
    iv: text("iv").notNull(), // Unique AES-256-GCM initialization vector
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    index("idx_credentials_user_provider").on(t.userId, t.provider),
    index("idx_credentials_expires_at").on(t.expiresAt),
  ],
)

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["system", "human"] }).notNull(),
  name: text("name").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  expectedOutputSchema: text("expected_output_schema").notNull(), // JSON Schema string
  isActive: integer("is_active").default(1).notNull(),
  createdAt: integer("created_at").notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Credential = typeof credentials.$inferSelect
export type NewCredential = typeof credentials.$inferInsert
export type Agent = typeof agents.$inferSelect
export type NewAgent = typeof agents.$inferInsert

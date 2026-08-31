import { defineConfig } from "drizzle-kit"

import config from "./src/config/index.ts"

export default defineConfig({
  dialect: "turso",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Local dev uses a file: URL with no authToken; production uses a
    // remote libsql:// Turso URL with one.
    url: config.database.url,
    authToken: config.database.authToken,
  },
})

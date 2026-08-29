import { defineConfig } from "drizzle-kit"

import config from "./src/config/index.ts"

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Drizzle Kit's SQLite driver expects the file: URL format.
    url: config.database.url,
  },
})

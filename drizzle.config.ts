import { defineConfig } from "drizzle-kit"

import config from "./src/config/index.ts"

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // bun:sqlite opens a plain file path, not a file: URL.
    url: config.database.url.replace(/^file:/, ""),
  },
})

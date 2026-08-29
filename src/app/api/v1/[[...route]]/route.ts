import { sql } from "drizzle-orm"
import { Hono } from "hono"
import { handle } from "hono/vercel"

import config from "@/config"
import { getDb } from "@/lib/db"
import {
  ingest,
  logger,
  openObserveMiddleware,
} from "@/lib/observability/logger"
import { telemetryEventSchema } from "@/lib/schemas"
import { credentialsModule } from "@/server/credentials"
import { oauthModule } from "@/server/oauth"

/**
 * Hono backend mounted inside the Next.js App Router (TRD §1, §3).
 * All v1 routes live under /api/v1/*; later tasks register credentials,
 * oauth, agents, and relay/process sub-routers here.
 */

const app = new Hono().basePath(`/api/${config.api.version}`)

app.use("*", openObserveMiddleware())

app.route("/credentials", credentialsModule)
app.route("/oauth", oauthModule)

app.get("/health", (c) => {
  const db = getDb()
  const tables = db.all<{ name: string }>(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name`,
  )
  return c.json({
    status: "ok",
    app: config.app.name,
    version: config.app.version,
    runtime: "bun",
    tables: tables.map((t) => t.name),
  })
})

// Client RUM ingest proxy — browser events are forwarded to the
// OpenObserve client stream without exposing credentials.
app.post("/telemetry", async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = telemetryEventSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: "Invalid telemetry payload" }, 400)
  }
  const event = parsed.data
  ingest(config.observability.streams.client, {
    level: event.event_type === "client_error" ? "error" : "info",
    message: event.event_type,
    service: "relay-client",
    ...event,
  })
  return c.json({ ok: true })
})

app.notFound((c) => c.json({ error: "Not found" }, 404))

app.onError((error, c) => {
  logger.error("API handler error", {
    path: c.req.path,
    error: error.message,
  })
  return c.json({ error: "Internal server error" }, 500)
})

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)

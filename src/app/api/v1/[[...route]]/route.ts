import { sql } from "drizzle-orm"
import { Hono } from "hono"
import { handle } from "hono/vercel"

import config from "@/config"
import { getDb } from "@/lib/db"
import { openObserveMiddleware } from "@/lib/observability/http-trace"
import { ingest, logger } from "@/lib/observability/logger"
import { telemetryEventSchema } from "@/lib/schemas"
import { agentsModule } from "@/server/agents"
import { analyticsModule } from "@/server/analytics"
import { credentialsModule } from "@/server/credentials"
import { promptsModule } from "@/server/prompts"
import { raysModule } from "@/server/rays"
import { relayModule, runsModule } from "@/server/runs"
import { settingsModule } from "@/server/settings"
import { socialModule } from "@/server/social"

/**
 * Hono backend mounted inside the Next.js App Router (TRD §1, §3).
 * All v1 routes live under /api/v1/*; later tasks register credentials,
 * rays, agents, and relay/process sub-routers here.
 */

const app = new Hono().basePath(`/api/${config.api.version}`)

app.use("*", openObserveMiddleware())

app.route("/analytics", analyticsModule)
app.route("/credentials", credentialsModule)
app.route("/social", socialModule)
// Rays are Relay's public integration routes; OAuth is the underlying protocol.
app.route("/rays/oauth", raysModule)
app.route("/agents", agentsModule)
app.route("/prompts", promptsModule)
app.route("/runs", runsModule)
app.route("/relay", relayModule)
app.route("/settings", settingsModule)

app.get("/health", async (c) => {
  const db = getDb()
  const tables = await db.all<{ name: string }>(
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
export const PATCH = handle(app)
export const DELETE = handle(app)

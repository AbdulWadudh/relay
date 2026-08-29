import { Hono } from "hono"
import { handle } from "hono/vercel"

import { getDb } from "@/lib/db"
import {
  ingest,
  logger,
  openObserveMiddleware,
} from "@/lib/observability/logger"

/**
 * Hono backend mounted inside the Next.js App Router (TRD §1, §3).
 * All v1 routes live under /api/v1/*; later tasks register credentials,
 * oauth, agents, and relay/process sub-routers here.
 */

const app = new Hono().basePath("/api/v1")

app.use("*", openObserveMiddleware())

app.get("/health", (c) => {
  const db = getDb()
  const tables = db
    .query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all()
  return c.json({
    status: "ok",
    runtime: "bun",
    tables: tables.map((t) => t.name),
  })
})

// Client RUM ingest proxy — browser events are forwarded to the
// OpenObserve `relay_client` stream without exposing credentials.
app.post("/telemetry", async (c) => {
  const event = await c.req.json().catch(() => null)
  if (!event || typeof event !== "object") {
    return c.json({ error: "Invalid telemetry payload" }, 400)
  }
  ingest("relay_client", {
    level: event.event_type === "client_error" ? "error" : "info",
    message: String(event.event_type ?? "unknown"),
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

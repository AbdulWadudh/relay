/**
 * Which request logs are NOT worth shipping to OpenObserve.
 *
 * WHY THIS MODULE EXISTS AND NOT A CONFIG ENTRY. Two different layers log
 * requests and both have to agree: `src/proxy.ts` (Next's proxy, which runs
 * in the EDGE runtime and deliberately reads `process.env` directly rather
 * than importing `@/config`) and `openObserveMiddleware` in
 * `src/lib/observability/logger.ts` (Node). So the list lives in a module
 * with no imports at all, importable from both, the same way
 * `src/lib/media/sources.ts` stays dependency-free so client components can
 * read it. Duplicating it in two files is the thing this avoids.
 *
 * These skip the OPENOBSERVE sink only. stdout and the log file still carry
 * every line, so local debugging is unchanged — the goal is to stop paying
 * durable storage for traffic that answers no question.
 */

/**
 * Mirrors `config.api.version`. Not imported, for the edge-runtime reason
 * above; if that value ever changes, this changes with it.
 */
const API_BASE = "/api/v1"

/**
 * Exact paths whose request log is dropped before it reaches OpenObserve.
 *
 * `/health` is Docker's container healthcheck, every 30s forever — 2,880
 * lines a day per container that say nothing `docker ps` does not already
 * say, and which are only ever read when the container is ALREADY known to
 * be unhealthy.
 *
 * `/telemetry` is the browser's own beacon. Its request body IS the client
 * log/RUM payload, and the OpenObserve browser SDK already ships that to
 * the `relay_client` stream independently — so logging the HTTP call stores
 * a second copy of something already stored, up to 8KB at a time.
 */
const SKIP_EXACT: readonly string[] = [
  `${API_BASE}/health`,
  `${API_BASE}/telemetry`,
]

/**
 * Static assets. Next's proxy matcher only excludes `_next/static`,
 * `_next/image` and `favicon.ico`, so everything else served out of
 * `public/` — the logo on every single page render, most obviously — was
 * being recorded as a request worth keeping for 30 days.
 */
const SKIP_EXTENSIONS: readonly string[] = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".css",
  ".js",
  ".map",
  ".txt",
  ".xml",
  ".webmanifest",
]

/** True when this request's log line should not reach OpenObserve. */
export function skipRequestLog(path: string): boolean {
  if (SKIP_EXACT.includes(path)) return true
  const dot = path.lastIndexOf(".")
  if (dot === -1) return false
  return SKIP_EXTENSIONS.includes(path.slice(dot).toLowerCase())
}

/**
 * Paths whose request/response BODY is not traced, while the status and
 * duration still are.
 *
 * A separate decision from `skipRequestLog`, because the problem is
 * different: `GET /runs/:id/logs` returns the run's log lines, the UI polls
 * it every 2s while a run is live, and the middleware traces response
 * bodies up to 8KB — so watching one live run re-ingests its own logs into
 * the log store, repeatedly. The latency and status of that endpoint are
 * worth keeping; a duplicate of its payload is not.
 */
export function skipBodyTrace(path: string): boolean {
  return path.startsWith(`${API_BASE}/runs/`) && path.endsWith("/logs")
}

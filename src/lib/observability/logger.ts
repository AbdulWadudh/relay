import { Writable } from "node:stream"
import type pinoDefault from "pino"
import type { DestinationStream, Logger } from "pino"

import config from "@/config"
import { redactLogValue } from "@/lib/observability/redact"
import { currentRunContext } from "@/lib/observability/run-context"
import { RunLogStream } from "@/lib/observability/run-log-stream"
import { skipRequestLog } from "@/lib/observability/skip-paths"

// require (not a static import) with turbopackIgnore so Turbopack leaves this
// call untouched instead of routing it through its dev-mode external-module
// wrapper, which has a known bug resolving pino's worker-thread transport
// ("Failed to load external module pino-<hash>"). Production builds/next
// start were never affected — this only works around next dev.
const pino = require(/* turbopackIgnore: true */ "pino") as typeof pinoDefault

export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogEventInput {
  level: LogLevel
  message: string
  service: string
  [key: string]: unknown
}

interface OpenObserveConfig {
  url: string
  org: string
  stream: string
  authorization: string
}

function getOpenObserveConfig(): OpenObserveConfig | null {
  const { url, token, org, streams } = config.observability
  if (!url || !token) return null
  return {
    url: url.replace(/\/$/, ""),
    org,
    stream: streams.server,
    authorization: token,
  }
}

const openObserveConfig = getOpenObserveConfig()

class OpenObserveStream extends Writable {
  private readonly pending: Record<string, unknown>[] = []
  private timer: ReturnType<typeof setTimeout> | null = null

  override _write(
    chunk: Buffer,
    _encoding: string,
    callback: (error?: Error) => void,
  ) {
    try {
      const record = JSON.parse(chunk.toString()) as Record<string, unknown>
      // Dropped HERE rather than at the log site, so stdout and the log
      // file still carry the line and only the durable sink is spared.
      // `path` is set by `openObserveMiddleware`; a record without one is
      // not a request log and is never skipped.
      if (typeof record.path === "string" && skipRequestLog(record.path)) {
        callback()
        return
      }
      this.pending.push(record)
      if (this.pending.length >= 50) void this.flush()
      else this.schedule()
      callback()
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)))
    }
  }

  private schedule() {
    if (this.timer) return
    this.timer = setTimeout(() => {
      this.timer = null
      void this.flush()
    }, 2000)
  }

  private async flush() {
    const target = openObserveConfig
    if (!target || this.pending.length === 0) return
    const events = this.pending.splice(0, this.pending.length)
    try {
      await fetch(`${target.url}/api/${target.org}/${target.stream}/_json`, {
        method: "POST",
        headers: {
          Authorization: target.authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(events),
      })
    } catch (error) {
      console.error("[observability] OpenObserve ingest failed:", error)
    }
  }

  async shutdown() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    await this.flush()
  }
}

const openObserveStream = openObserveConfig ? new OpenObserveStream() : null

/**
 * Appends to a local file so the web app, the worker and the capture
 * service can be read together instead of across three terminals.
 *
 * `append: true` matters — the three processes start at different times and
 * a truncating open would erase whichever started first. `mkdir: true`
 * saves a first-run failure on a clean checkout. A failure to open the file
 * must never take the process down, so it degrades to stdout only.
 */
function fileStream(): DestinationStream | null {
  const dest = config.observability.logFile
  if (!dest) return null
  try {
    return pino.destination({ dest, append: true, mkdir: true, sync: false })
  } catch (error) {
    console.error("[observability] could not open log file:", error)
    return null
  }
}

// Opened ONCE — calling fileStream() per array slot would open two
// independent handles onto the same file and interleave their writes.
const logFileStream = fileStream()

const streams = [
  { stream: process.stdout },
  ...(logFileStream ? [{ stream: logFileStream }] : []),
  ...(openObserveStream ? [{ stream: openObserveStream }] : []),
  // `level: "debug"` ONLY on this stream, deliberately.
  //
  // pino.multistream filters each stream at `info` unless told otherwise,
  // so before this every `logger.debug` in the codebase was discarded by
  // all three sinks. The run log wants the debug detail — yt-dlp's own
  // output is logged at that level — but raising it on stdout, the file
  // and OpenObserve would multiply their volume for every run. So the
  // LIVE view is complete and the historical view is info-and-above.
  { stream: new RunLogStream(), level: "debug" as const },
]

const pinoLogger: Logger = pino(
  {
    level: "debug",
    base: { service: config.observability.service },
    /**
     * Stamps the ambient run and stage onto EVERY line, which is what
     * makes the per-stage grouping in the UI possible without threading a
     * runId through every function in the pipeline. Outside a run this
     * returns nothing and the record is unchanged, so web requests are
     * unaffected.
     */
    mixin: () => {
      const context = currentRunContext()
      return context ? { run_id: context.runId, stage: context.stage } : {}
    },
  },
  pino.multistream(streams),
)

export function ingest(stream: string, event: LogEventInput) {
  const child = pinoLogger.child({ stream })
  child[event.level]({ ...event, _timestamp: Date.now() }, event.message)
}

export async function flushAll() {
  await openObserveStream?.shutdown()
}

function log(level: LogLevel) {
  return (message: string, fields: Record<string, unknown> = {}) =>
    pinoLogger[level](fields, message)
}

export const logger = {
  debug: log("debug"),
  info: log("info"),
  warn: log("warn"),
  error: log("error"),
}

export { isSensitiveKey, redactLogValue } from "@/lib/observability/redact"

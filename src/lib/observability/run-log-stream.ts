import { Writable } from "node:stream"

import { redactLogValue } from "@/lib/observability/redact"
import { appendRunLog } from "@/lib/observability/run-logs"

/**
 * Tees log lines that belong to a run into that run's live stream, so the
 * detail view can show what happened under each stage.
 *
 * A STREAM rather than a call at each log site: every `logger.*` call in
 * the pipeline is captured without touching one of them, and a line added
 * to the pipeline tomorrow appears in the UI for free. `run_id` arrives
 * via the `mixin` below, so even code that has never heard of a run —
 * `src/lib/media/download.ts` logs `{ source, item_id }` — is attributed
 * correctly.
 */
let sequence = 0

export class RunLogStream extends Writable {
  override _write(
    chunk: Buffer,
    _encoding: string,
    callback: (error?: Error) => void,
  ) {
    try {
      const record = JSON.parse(chunk.toString()) as Record<string, unknown>
      const runId = record.run_id
      if (typeof runId === "string" && runId) {
        const { level, msg, time, stage, run_id, service, ...rest } = record
        const at = typeof time === "number" ? time : Date.now()
        // Monotonic within this process, which is the only one writing a
        // given run's logs -- see `RunLogLine.id`.
        sequence += 1
        appendRunLog(runId, {
          id: `${at}-${sequence}`,
          at,
          level: LEVEL_NAMES[level as number] ?? String(level ?? "info"),
          stage: typeof stage === "string" ? stage : "",
          message: typeof msg === "string" ? msg : "",
          // REDACTED HERE, and this is the only place it happens for
          // `logger.*` calls. `redactLogValue` was previously applied only
          // to HTTP trace bodies, because everything else relied on call
          // sites never logging a secret. That discipline was enough while
          // logs went to stdout and OpenObserve; these lines are RENDERED
          // IN THE PRODUCT, so a single careless field would put a token
          // on a page. Made safe by construction instead.
          ...(Object.keys(rest).length > 0
            ? { fields: redactLogValue(rest) as Record<string, unknown> }
            : {}),
        })
      }
      callback()
    } catch {
      // A malformed record must not break the other streams, and must not
      // be reported through `logger` — that would recurse into here.
      callback()
    }
  }
}

/** pino writes numeric levels; the UI wants names. */
const LEVEL_NAMES: Record<number, string> = {
  10: "trace",
  20: "debug",
  30: "info",
  40: "warn",
  50: "error",
  60: "fatal",
}

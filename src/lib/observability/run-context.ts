import { AsyncLocalStorage } from "node:async_hooks"

/**
 * Which run, and which pipeline stage, the current async work belongs to.
 *
 * WHY THIS EXISTS. The run detail view shows a log stream per stage
 * (`run-stage-logs.tsx`), which needs every log line attributed to a run
 * AND a stage. The pipeline already logs plenty, but only SOME calls pass
 * `run_id` — `src/lib/media/download.ts` logs `{ source, item_id }` and
 * nothing else, because it has no idea a run exists. Threading a runId
 * parameter down through download -> transcription -> extraction to reach
 * every `logger` call would touch every signature in the pipeline to serve
 * a UI concern.
 *
 * So the context is ambient instead. `withRunContext` wraps the job once
 * in src/lib/pipeline.ts, pino's `mixin` reads it on every log line (see
 * logger.ts), and no call site changes at all.
 *
 * Deliberately NOT a general-purpose request context. It holds the two
 * fields the log stream needs and nothing else — a grab-bag here would
 * quietly become a second way to pass arguments.
 */

export interface RunContext {
  runId: string
  /**
   * Mutable, and that is the point: `enter()` in the pipeline advances it
   * as the run moves, so lines logged after a transition attribute to the
   * new stage without re-entering the storage.
   */
  stage: string
}

const storage = new AsyncLocalStorage<RunContext>()

/**
 * Runs `work` with run/stage attribution attached to every log line it
 * emits, however deep.
 *
 * Bun implements `node:async_hooks` AsyncLocalStorage, and this is
 * exercised by the worker on every job — but note the limit that comes
 * with it: context does NOT survive a boundary that loses the async
 * chain, such as a `setTimeout` scheduled outside the callback or a
 * subprocess. Tool output is therefore logged from inside the callback
 * (download.ts) rather than relying on the child process inheriting
 * anything.
 */
export function withRunContext<T>(
  runId: string,
  stage: string,
  work: () => Promise<T>,
): Promise<T> {
  return storage.run({ runId, stage }, work)
}

/** No-op outside a run — a web request has no stage to advance. */
export function setRunStage(stage: string): void {
  const context = storage.getStore()
  if (context) context.stage = stage
}

export function currentRunContext(): RunContext | undefined {
  return storage.getStore()
}

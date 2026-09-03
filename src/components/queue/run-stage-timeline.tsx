import {
  AiMagicIcon,
  AudioWave01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Download04Icon,
  Sent02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useState } from "react"

import { RunStageLogs } from "@/components/queue/run-stage-logs"
import { type RunLogLine, useRunLogs } from "@/lib/query/runs"
import {
  isTerminal,
  PIPELINE_STAGES,
  RUN_STATUS_META,
  type RunStatus,
} from "@/lib/run-status"
import { cn } from "@/lib/utils"

/**
 * The run's journey through the pipeline.
 *
 * Each stage carries its OWN icon so the rail is readable at a glance
 * (clock, download, waveform, extract, send), and **colour carries the
 * state**: emerald done, sky running, red failed, muted not-run. The icon
 * never changes as a stage progresses, only its colour does, which keeps
 * the rail visually stable while a run moves through it.
 *
 * Stage order and per-stage timing keys come from RUN_STATUS_META, so a
 * stage added to the schema appears here automatically. The icon map is
 * `Record<RunStatus, ...>`, exhaustive by type, so a new status is a
 * compile error until it is given an icon.
 */

type StageState = "complete" | "current" | "failed" | "skipped" | "pending"

const STAGE_ICON: Record<RunStatus, typeof Clock01Icon> = {
  queued: Clock01Icon,
  downloading: Download04Icon,
  transcribing: AudioWave01Icon,
  extracting: AiMagicIcon,
  publishing: Sent02Icon,
  // Terminal statuses never render in the rail; present for exhaustiveness.
  done: CheckmarkCircle02Icon,
  failed: CheckmarkCircle02Icon,
}

/**
 * Derived from EVIDENCE, not from position in the list. A stage counts as
 * complete only when it actually recorded timings, so stages the pipeline
 * does not implement yet read as "not run" on a finished run instead of
 * falsely claiming a green tick.
 */
function stageState(
  stage: RunStatus,
  status: RunStatus,
  failedStage: string | null,
  timings: Record<string, number>,
): StageState {
  if (status === "failed" && stage === failedStage) return "failed"
  if (stage === status) return "current"

  const ran =
    // Every run is queued; the stage records no timing of its own.
    stage === "queued" ||
    RUN_STATUS_META[stage].timingKeys.some(
      (key) => typeof timings[key] === "number",
    )
  if (ran) return "complete"

  // The run has stopped, so anything without evidence never happened.
  return status === "done" || status === "failed" ? "skipped" : "pending"
}

function formatMs(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
}

/** Solid fills (RULES.md), each meeting contrast against a white glyph. */
const DOT: Record<StageState, string> = {
  complete: "border-emerald-600 bg-emerald-600 text-white",
  current: "border-sky-600 bg-sky-600 text-white",
  failed: "border-red-600 bg-red-600 text-white",
  skipped: "border-dashed border-border bg-transparent text-muted-foreground",
  pending: "border-border bg-muted text-muted-foreground",
}

export function RunStageTimeline({
  runId,
  status,
  timings,
  failedStage,
}: {
  runId: string
  status: RunStatus
  timings: Record<string, number>
  failedStage: string | null
}) {
  const [open, setOpen] = useState<Set<RunStatus>>(new Set())

  /**
   * ONE request for the whole rail, not one per stage. The endpoint returns
   * every line for the run and the grouping happens here — five stages
   * fetching the same payload would quadruple the traffic to show the same
   * data, and would poll out of step with each other while a run is live.
   */
  const { data, isFetching } = useRunLogs(runId, {
    enabled: open.size > 0,
    live: !isTerminal(status),
  })

  const byStage = new Map<string, RunLogLine[]>()
  for (const line of data?.lines ?? []) {
    const bucket = byStage.get(line.stage)
    if (bucket) bucket.push(line)
    else byStage.set(line.stage, [line])
  }

  const toggle = (stage: RunStatus) =>
    setOpen((current) => {
      const next = new Set(current)
      if (!next.delete(stage)) next.add(stage)
      return next
    })

  return (
    <ol className="flex flex-col">
      {PIPELINE_STAGES.map((stage, index) => {
        const state = stageState(stage, status, failedStage, timings)
        const meta = RUN_STATUS_META[stage]
        const entries = meta.timingKeys
          .filter((key) => typeof timings[key] === "number")
          .map((key) => ({ key, ms: timings[key] as number }))
        const last = index === PIPELINE_STAGES.length - 1

        return (
          <li key={stage} className="flex gap-3">
            {/* Rail: the stage's own icon, plus the connector to the next. */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border",
                  DOT[state],
                  // Only the running stage animates, and only when the user
                  // has not asked for reduced motion.
                  state === "current" && "motion-safe:animate-pulse",
                )}
              >
                <HugeiconsIcon
                  icon={STAGE_ICON[stage]}
                  strokeWidth={2}
                  className="size-3.5"
                  aria-hidden
                />
              </span>
              {last ? null : (
                <span
                  className={cn(
                    "w-px flex-1",
                    state === "complete" ? "bg-emerald-600" : "bg-border",
                  )}
                />
              )}
            </div>

            <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-5")}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  className={cn(
                    "font-medium text-sm",
                    (state === "pending" || state === "skipped") &&
                      "text-muted-foreground",
                  )}
                >
                  {meta.label}
                </span>
                {entries.length > 0 ? (
                  <span className="font-mono text-muted-foreground text-xs tabular-nums">
                    {entries
                      .map(
                        (entry) =>
                          `${entry.key.replace(/_ms$/, "")} ${formatMs(entry.ms)}`,
                      )
                      .join("  ·  ")}
                  </span>
                ) : null}
              </div>
              {/* Colour is the primary state signal but never the ONLY one
                  (a11y: do not convey meaning by colour alone). */}
              {state === "failed" ? (
                <p className="mt-0.5 text-red-700 text-xs dark:text-red-400">
                  Stopped here
                </p>
              ) : null}
              {state === "current" ? (
                <p className="mt-0.5 text-sky-700 text-xs dark:text-sky-400">
                  Running
                </p>
              ) : null}
              {state === "skipped" ? (
                <p className="mt-0.5 text-muted-foreground text-xs">Not run</p>
              ) : null}
              {/* A stage that never ran has nothing to show, so it gets no
                  disclosure at all rather than one that opens onto an
                  empty panel. */}
              {state === "pending" || state === "skipped" ? null : (
                <RunStageLogs
                  panelId={`run-logs-${stage}`}
                  lines={byStage.get(stage) ?? []}
                  expanded={open.has(stage)}
                  onToggle={() => toggle(stage)}
                  loading={isFetching}
                  source={data?.source}
                />
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

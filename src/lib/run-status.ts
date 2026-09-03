import type { RunStatus } from "@/lib/db/schema"

/**
 * Run status vocabulary shared by the service and the Queue UI.
 *
 * Deliberately free of any runtime import — the only import is `type
 * RunStatus`, which is erased at compile time — so client components can
 * use this without dragging Drizzle and the database driver into the
 * browser bundle (src/lib/runs.ts cannot be imported from the client).
 *
 * `Record<RunStatus, ...>` is exhaustive by type: adding a status to the
 * schema without describing it here is a compile error, so the two can't
 * drift apart.
 */

export interface RunStatusMeta {
  label: string
  /** Solid badge fill (RULES.md: solid colors only, no translucency). */
  badge: string
  /** True while the run is still moving — drives polling and the spinner. */
  active: boolean
  /**
   * Keys this stage contributes to `relay_runs.timings`, so the detail
   * view can show what each stage cost without hardcoding a second
   * stage->timing map somewhere else.
   */
  timingKeys: readonly string[]
}

export const RUN_STATUS_META: Record<RunStatus, RunStatusMeta> = {
  queued: {
    timingKeys: [],
    label: "Queued",
    badge: "bg-zinc-600 text-white dark:bg-zinc-600",
    active: true,
  },
  downloading: {
    timingKeys: ["download_ms", "audio_extract_ms"],
    label: "Downloading",
    badge: "bg-sky-600 text-white dark:bg-sky-600",
    active: true,
  },
  transcribing: {
    timingKeys: ["transcribe_ms", "transliterate_ms"],
    label: "Transcribing",
    badge: "bg-indigo-600 text-white dark:bg-indigo-600",
    active: true,
  },
  extracting: {
    // `extract_ms` is AGENT extraction (Task 4.4). ffmpeg's audio
    // extraction records `audio_extract_ms` against `downloading` above —
    // the two must not share a key, or one stage's work would mark the
    // other complete.
    // `frames_*` are written by the frames path (src/lib/analysis.ts) and
    // belong here, not to `transcribing`: reading frames is what the
    // extracting stage does when the audio had nothing to say.
    timingKeys: [
      "route_ms",
      "extract_ms",
      "verify_ms",
      "frames_download_ms",
      "frames_render_ms",
    ],
    label: "Extracting",
    badge: "bg-violet-600 text-white dark:bg-violet-600",
    active: true,
  },
  publishing: {
    timingKeys: ["publish_ms"],
    label: "Publishing",
    badge: "bg-amber-600 text-white dark:bg-amber-600",
    active: true,
  },
  done: {
    timingKeys: [],
    label: "Done",
    badge: "bg-emerald-600 text-white dark:bg-emerald-600",
    active: false,
  },
  failed: {
    timingKeys: [],
    label: "Failed",
    badge: "bg-red-600 text-white dark:bg-red-600",
    active: false,
  },
}

export const RUN_STATUSES = Object.keys(RUN_STATUS_META) as RunStatus[]

/**
 * The pipeline stages in order, i.e. every status a run passes *through*
 * rather than ends on. Derived from `active` so adding a stage to the
 * schema puts it in the detail view's timeline automatically.
 */
export const PIPELINE_STAGES: RunStatus[] = RUN_STATUSES.filter(
  (status) => RUN_STATUS_META[status].active,
)

export function runStatusMeta(status: RunStatus): RunStatusMeta {
  return RUN_STATUS_META[status]
}

/** A run in a terminal status will never change again on its own. */
export function isTerminal(status: RunStatus): boolean {
  return !RUN_STATUS_META[status].active
}

export type { RunStatus }

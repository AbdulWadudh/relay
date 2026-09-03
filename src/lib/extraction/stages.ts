import type { ChatTask } from "@/lib/extraction/providers"

/**
 * The pipeline steps that make their own model call, and are therefore the
 * things a provider order can be set FOR (human decision 2026-09-04).
 *
 * Four, no more: `evidence_contract` is a prompt concatenated into the
 * extraction system prompt (src/lib/extraction/index.ts), not a call of
 * its own, so it has no provider to choose and does not appear here.
 *
 * PLAIN DATA — no React, no Tailwind. The Settings tabs render from this,
 * so adding a stage is one entry here plus a `stage:` at the new call
 * site (RULES.md: no hardcoding, the registry is the source of truth).
 */

export type ChatStage =
  | "extraction"
  | "frames"
  | "agent_router"
  | "schema_synthesizer"

export interface ChatStageInfo {
  id: ChatStage
  label: string
  /**
   * Narrow-screen label. Four full labels do not fit one phone row, and
   * letting them wrap left the orphaned tab stretched to full width while
   * its neighbours shared a line — worse than a short word.
   */
  short: string
  /** One line, shown under the tab. */
  description: string
  /**
   * How the ranker treats this stage. Two stages can share a task:
   * routing and schema synthesis both read a truncated transcript, so
   * both need less context than extraction (see `rankModels`).
   */
  task: ChatTask
  /**
   * Only models advertising image input can serve this stage. Informational
   * here — the actual filter keys off the image being present at all
   * (src/lib/extraction/chat-attempt.ts), which cannot drift.
   */
  vision?: boolean
  /**
   * Where this stage records `{ provider, model }` on a run's
   * `additional_data`. Null means it records nothing there: schema
   * synthesis writes its model onto the AGENT row it creates
   * (src/lib/extraction/synthesize.ts), so a run cannot be attributed to
   * it and the analytics dashboard omits the stage rather than showing a
   * silent zero.
   */
  additionalDataKey: string | null
}

export const CHAT_STAGES = [
  {
    id: "extraction",
    label: "Extraction",
    short: "Extract",
    description: "The agent reading the transcript and filling its schema.",
    task: "extraction",
    additionalDataKey: "extraction",
  },
  {
    id: "agent_router",
    label: "Agent router",
    short: "Router",
    description: "Picks which agent handles a video, or asks for a new one.",
    task: "synthesis",
    additionalDataKey: "routing",
  },
  {
    id: "schema_synthesizer",
    label: "Schema synthesizer",
    short: "Schema",
    description: "Invents an output schema when no existing agent fits.",
    task: "synthesis",
    additionalDataKey: null,
  },
  {
    id: "frames",
    label: "Frames",
    short: "Frames",
    description:
      "Reads on-screen text from video frames. Needs an account whose models accept images.",
    task: "extraction",
    vision: true,
    additionalDataKey: "screen_text",
  },
] as const satisfies readonly ChatStageInfo[]

export const CHAT_STAGE_IDS = CHAT_STAGES.map((stage) => stage.id) as [
  ChatStage,
  ...ChatStage[],
]

export function chatStage(id: string): ChatStageInfo | null {
  return CHAT_STAGES.find((stage) => stage.id === id) ?? null
}

export function taskForStage(id: ChatStage): ChatTask {
  return chatStage(id)?.task ?? "extraction"
}

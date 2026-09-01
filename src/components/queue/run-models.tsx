import { ProviderMark } from "@/components/provider-mark"
import { providerLabel } from "@/lib/providers"
import { cn } from "@/lib/utils"

/**
 * Who did what in this run: the agent or prompt responsible for each
 * stage, and the model it ran on.
 *
 * Assembled from `additional_data` — every stage already records its own
 * provider/model there, so this reads facts the pipeline stored rather
 * than adding bookkeeping.
 *
 * A stage that consulted no model is shown explicitly rather than hidden.
 * "No model needed" is a real outcome (an explicitly requested agent skips
 * routing entirely) and a missing row would read as a bug.
 */

interface Phase {
  stage: string
  /** The agent or prompt responsible for this stage. */
  by: string
  /** What it decided, where that is the interesting part. */
  outcome?: string
  provider?: string
  model?: string
  note?: string
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

const MODE_LABEL: Record<string, string> = {
  requested: "you picked it",
  human: "your own agent",
  system: "existing agent",
  synthesized: "created by this run",
}

export function phasesFrom(additionalData: Record<string, unknown>): Phase[] {
  const transcript = (additionalData.transcript ?? {}) as Record<
    string,
    unknown
  >
  const routing = (additionalData.routing ?? {}) as Record<string, unknown>
  const extraction = (additionalData.extraction ?? {}) as Record<
    string,
    unknown
  >

  const phases: Phase[] = []
  const agentName = str(routing.agent_name)
  const mode = str(routing.mode)

  if (str(transcript.provider) || str(transcript.audio_model)) {
    phases.push({
      stage: "Transcription",
      by: "Speech-to-text — no agent involved",
      provider: str(transcript.provider),
      model: str(transcript.audio_model),
    })
  }

  if (Object.keys(routing).length > 0) {
    phases.push({
      stage: "Agent routing",
      by: "Agent router prompt",
      outcome: agentName
        ? `Chose ${agentName}${mode ? ` — ${MODE_LABEL[mode] ?? mode}` : ""}`
        : undefined,
      provider: str(routing.provider),
      model: str(routing.model),
      note: str(routing.provider)
        ? undefined
        : mode === "requested"
          ? "No model needed — agent was chosen explicitly"
          : "Not recorded",
    })
  }

  if (Object.keys(extraction).length > 0) {
    phases.push({
      stage: "Extraction",
      by: agentName ? `Agent: ${agentName}` : "Agent (name not recorded)",
      provider: str(extraction.provider),
      model: str(extraction.model),
    })
  }

  return phases
}

/**
 * A solid accent bar per stage so the three phases read apart at a glance
 * (RULES.md: own accent per element, solid fills, no translucency). These
 * shades are legible on both the near-black and the white card.
 */
const STAGE_BAR: Record<string, string> = {
  Transcription: "bg-sky-500",
  "Agent routing": "bg-violet-500",
  Extraction: "bg-emerald-500",
}

function ProviderChip({ provider }: { provider?: string }) {
  if (!provider) {
    return <span className="text-muted-foreground text-xs">No provider</span>
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1">
      <ProviderMark provider={provider} className="size-4" />
      <span className="font-medium text-xs">{providerLabel(provider)}</span>
    </span>
  )
}

export function RunModels({
  additionalData,
}: {
  additionalData: Record<string, unknown>
}) {
  const phases = phasesFrom(additionalData)
  if (phases.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No agent or model activity recorded for this run.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {phases.map((phase) => (
        <li
          key={phase.stage}
          className="relative overflow-hidden rounded-lg border border-border bg-card transition-colors duration-150 hover:border-zinc-400 hover:bg-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        >
          <span
            aria-hidden
            className={cn(
              "absolute inset-y-0 left-0 w-1.5",
              STAGE_BAR[phase.stage] ?? "bg-zinc-500",
            )}
          />
          {/* Stacks below sm: at 380px a fixed two-column split left the
              model id a few characters wide and it truncated mid-token. */}
          <div className="flex flex-col gap-3 py-4 pr-4 pl-5 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{phase.stage}</p>
              <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                {phase.by}
                {phase.outcome ? ` · ${phase.outcome}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <ProviderChip provider={phase.provider} />
              <code className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                {phase.model ?? phase.note ?? "—"}
              </code>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

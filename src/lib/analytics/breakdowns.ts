import config from "@/config"

import type { RunFact } from "@/lib/analytics/facts"
import { dayKey, dayKeys, type Window } from "@/lib/analytics/window"
import type { AnalysisMode } from "@/lib/db/schema"
import { SOCIAL_PROVIDERS } from "@/lib/providers"
import { isTerminal } from "@/lib/run-status"

/**
 * Throughput over time, and the three "what kind of work is this" splits:
 * source, analysis mode, and routed agent.
 *
 * Vocabulary comes from the registries — SOCIAL_PROVIDERS for sources
 * (its labels are the PLATFORM names; MEDIA_SOURCES.label names one item,
 * "Instagram Reel", which reads wrong on an axis) and the schema's own
 * enum for analysis modes. A source or mode added upstream shows up here
 * with no edit (RULES.md: no hardcoding).
 */

export interface DayThroughput {
  day: string
  done: number
  failed: number
  inFlight: number
}

export interface Slice {
  id: string
  label: string
  count: number
  /** Of the runs in this slice that finished. Null while none have. */
  successRate: number | null
}

export interface Breakdowns {
  throughput: DayThroughput[]
  sources: Slice[]
  modes: Slice[]
  agents: Slice[]
  /** How many agents the "Other" row stands for, 0 when nothing folded. */
  agentTail: number
}

const ANALYSIS_MODE_LABELS: Record<AnalysisMode, string> = {
  auto: "Auto",
  vision: "Vision",
  both: "Both",
}

function successRate(facts: RunFact[]): number | null {
  const finished = facts.filter((fact) => isTerminal(fact.status))
  if (finished.length === 0) return null
  return (
    finished.filter((fact) => fact.status === "done").length / finished.length
  )
}

function slice(id: string, label: string, facts: RunFact[]): Slice {
  return { id, label, count: facts.length, successRate: successRate(facts) }
}

function throughput(facts: RunFact[], window: Window): DayThroughput[] {
  if (facts.length === 0) return []
  const from = window.from ?? Math.min(...facts.map((fact) => fact.createdAt))
  const buckets = new Map<string, DayThroughput>()
  for (const day of dayKeys(from, window.to)) {
    buckets.set(day, { day, done: 0, failed: 0, inFlight: 0 })
  }
  for (const fact of facts) {
    const bucket = buckets.get(dayKey(fact.createdAt))
    if (!bucket) continue
    if (fact.status === "done") bucket.done += 1
    else if (fact.status === "failed") bucket.failed += 1
    else bucket.inFlight += 1
  }
  return [...buckets.values()]
}

/**
 * Falls back to the name the ROUTER recorded on the run before giving up.
 * An agent can be deleted while its runs remain, and "Deleted agent" on a
 * row with six runs is strictly less useful than the name it had.
 */
function agentLabel(
  id: string,
  rows: RunFact[],
  names: Map<string, string>,
): string {
  if (id === "__unrouted") return "Never routed"
  const known = names.get(id)
  if (known) return known
  const recorded = rows.find((row) => row.agentName !== null)?.agentName
  return recorded ? `${recorded} (deleted)` : "Deleted agent"
}

function agents(
  facts: RunFact[],
  names: Map<string, string>,
): {
  rows: Slice[]
  tail: number
} {
  const byAgent = new Map<string, RunFact[]>()
  for (const fact of facts) {
    // A run that never reached routing has no agent; it is a real outcome,
    // not a gap, so it gets its own row rather than vanishing.
    const id = fact.agentId ?? "__unrouted"
    byAgent.set(id, [...(byAgent.get(id) ?? []), fact])
  }

  const ranked = [...byAgent.entries()]
    .map(([id, rows]) => slice(id, agentLabel(id, rows, names), rows))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  if (ranked.length <= config.analytics.topN) return { rows: ranked, tail: 0 }

  const head = ranked.slice(0, config.analytics.topN - 1)
  const tail = ranked.slice(config.analytics.topN - 1)
  return {
    rows: [
      ...head,
      {
        id: "__other",
        label: `Other (${tail.length} agents)`,
        count: tail.reduce((sum, row) => sum + row.count, 0),
        successRate: null,
      },
    ],
    tail: tail.length,
  }
}

export function buildBreakdowns(
  facts: RunFact[],
  window: Window,
  agentNames: Map<string, string>,
): Breakdowns {
  const routed = agents(facts, agentNames)

  return {
    throughput: throughput(facts, window),
    sources: SOCIAL_PROVIDERS.map((source) =>
      slice(
        source.id,
        source.label,
        facts.filter((fact) => fact.source === source.id),
      ),
    ).filter((row) => row.count > 0),
    modes: (Object.keys(ANALYSIS_MODE_LABELS) as AnalysisMode[])
      .map((mode) =>
        slice(
          mode,
          ANALYSIS_MODE_LABELS[mode],
          facts.filter((fact) => fact.analysisMode === mode),
        ),
      )
      .filter((row) => row.count > 0),
    agents: routed.rows,
    agentTail: routed.tail,
  }
}

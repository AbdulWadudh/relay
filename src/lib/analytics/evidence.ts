import { sql } from "drizzle-orm"
import type { RunFact } from "@/lib/analytics/facts"
import { humanizeCode } from "@/lib/analytics/failures"
import { dayKey, dayKeys, type Window } from "@/lib/analytics/window"
import { getDb } from "@/lib/db"
import { relayRuns } from "@/lib/db/schema"

/**
 * Evidence quality: how much of what the agents extracted survived being
 * checked against the transcript.
 *
 * The per-day series deliberately emits `null` for a day on which nothing
 * was scored. Drawing 0% there would assert that a day's extractions were
 * all clean when in fact none were attempted, which is the more misleading
 * of the two mistakes — a gap in a line reads as "no data" to everyone.
 */

export interface EvidenceDay {
  day: string
  extracted: number
  flagged: number
  /** Null on a day with nothing scored — the chart draws a gap. */
  flaggedRate: number | null
}

export interface FlagReason {
  reason: string
  label: string
  count: number
}

export interface Evidence {
  extracted: number
  verified: number
  flagged: number
  verifiedRate: number | null
  /** Runs that produced a verification summary at all. */
  runs: number
  perDay: EvidenceDay[]
  reasons: FlagReason[]
}

function perDay(facts: RunFact[], window: Window): EvidenceDay[] {
  const scored = facts.filter((fact) => fact.evidence !== null)
  if (scored.length === 0) return []
  const from = window.from ?? Math.min(...scored.map((fact) => fact.createdAt))

  const buckets = new Map<string, { extracted: number; flagged: number }>()
  for (const day of dayKeys(from, window.to)) {
    buckets.set(day, { extracted: 0, flagged: 0 })
  }
  for (const fact of scored) {
    const bucket = buckets.get(dayKey(fact.createdAt))
    if (!bucket || !fact.evidence) continue
    bucket.extracted += fact.evidence.extracted
    bucket.flagged += fact.evidence.flagged
  }

  return [...buckets.entries()].map(([day, bucket]) => ({
    day,
    extracted: bucket.extracted,
    flagged: bucket.flagged,
    flaggedRate:
      bucket.extracted > 0 ? bucket.flagged / bucket.extracted : null,
  }))
}

/**
 * Why claims were flagged, counted across the window's findings.
 *
 * Its own query rather than a column on the shared projection: the
 * findings array is the largest thing in `additional_data`, so it is
 * counted INSIDE SQLite with `json_each` and only the tallies cross the
 * wire. Reasons are grouped as the pipeline wrote them — nothing here
 * matches on a specific reason, so one added upstream just appears.
 */
async function flagReasons(
  userId: string,
  from: number | null,
  to: number,
): Promise<FlagReason[]> {
  // `coalesce(..., '[]')` is load-bearing: a run that never reached
  // extraction has no `$.verification`, and json_each over a missing path
  // is an error on some SQLite builds rather than an empty set.
  const rows = await getDb().all<{ reason: string | null; count: number }>(sql`
    select json_extract(finding.value, '$.reason') as reason,
           count(*) as count
      from ${relayRuns},
           json_each(
             coalesce(json_extract(${relayRuns.additionalData}, '$.verification'), '[]')
           ) as finding
     where ${relayRuns.userId} = ${userId}
       and ${relayRuns.createdAt} <= ${to}
       ${from === null ? sql`` : sql`and ${relayRuns.createdAt} >= ${from}`}
       and json_extract(finding.value, '$.status') = 'unverified'
     group by 1
  `)

  return rows
    .map((row) => ({
      reason: row.reason ?? "UNSPECIFIED",
      label: humanizeCode(row.reason ?? "UNSPECIFIED"),
      count: Number(row.count),
    }))
    .sort((a, b) => b.count - a.count)
}

export async function buildEvidence(
  facts: RunFact[],
  window: Window,
  userId: string,
): Promise<Evidence> {
  const scored = facts.filter((fact) => fact.evidence !== null)
  const sum = (pick: (fact: RunFact) => number) =>
    scored.reduce((total, fact) => total + pick(fact), 0)

  const extracted = sum((fact) => fact.evidence?.extracted ?? 0)

  return {
    extracted,
    verified: sum((fact) => fact.evidence?.verified ?? 0),
    flagged: sum((fact) => fact.evidence?.flagged ?? 0),
    verifiedRate:
      extracted > 0
        ? sum((fact) => fact.evidence?.verified ?? 0) / extracted
        : null,
    runs: scored.length,
    perDay: perDay(facts, window),
    reasons: await flagReasons(userId, window.from, window.to),
  }
}

import { and, desc, eq } from "drizzle-orm"

import type { ExistingRun } from "@/app/share/existing-run"
import { getDb } from "@/lib/db"
import { relayRuns } from "@/lib/db/schema"

/**
 * The most recent run this user already has for a canonical URL.
 *
 * Its own module rather than src/lib/runs.ts, which is already at the
 * 250-line cap.
 *
 * Matched on `source_url`, which the source registry has already
 * canonicalised, so `/shorts/<id>`, `youtu.be/<id>` and a link carrying
 * `?si=` tracking params all collapse to the same row.
 */
export async function findLatestRunForUrl(
  userId: string,
  canonicalUrl: string,
): Promise<ExistingRun | null> {
  const row = await getDb()
    .select({
      id: relayRuns.id,
      status: relayRuns.status,
      createdAt: relayRuns.createdAt,
    })
    .from(relayRuns)
    .where(
      and(eq(relayRuns.userId, userId), eq(relayRuns.sourceUrl, canonicalUrl)),
    )
    .orderBy(desc(relayRuns.createdAt))
    .limit(1)
    .get()

  return row ?? null
}

import { asc, eq } from "drizzle-orm"

import config from "@/config"

import type { RunFact } from "@/lib/analytics/facts"
import { getDb } from "@/lib/db"
import { type CredentialType, credentials } from "@/lib/db/schema"
import { providerLabel } from "@/lib/providers"

/**
 * Connected apps, and whether each one is actually healthy.
 *
 * Reads `additional_data.reject_count` explicitly rather than through
 * `listCredentials`, which reduces it to a `stale` boolean on purpose so
 * that nothing added to that column reaches the API by accident
 * (src/lib/vault.ts). Naming the field here is the opt-in that comment
 * describes; no token, IV, or ciphertext is selected.
 *
 * LAST USED IS PER PROVIDER, NOT PER ACCOUNT. A run records the provider
 * and model each stage used, never which credential the fallback chain
 * picked, so with two accounts on one provider there is no way to
 * attribute a run to one of them. The column says so rather than implying
 * a precision the data does not have — recording `credential_id` per
 * attempt is proposed separately in LLM_STATE.md.
 */

const DAY_MS = 86_400_000
const EXPIRING_SOON_DAYS = 7

export type CredentialHealth = "healthy" | "stale" | "expiring" | "expired"

export interface ConnectedApp {
  id: string
  provider: string
  providerLabel: string
  type: CredentialType
  /** metaData.account_name / account_email, never the secret. */
  account: string | null
  active: boolean
  health: CredentialHealth
  rejectCount: number
  expiresAt: number | null
  createdAt: number
  lastUsedAt: number | null
  /** How `lastUsedAt` was derived, so the UI can be precise about it. */
  lastUsedBasis: "model" | "publish" | "source" | null
}

function accountOf(meta: Record<string, unknown> | null): string | null {
  for (const key of ["account_name", "account_email", "label"]) {
    const value = meta?.[key]
    if (typeof value === "string" && value.length > 0) return value
  }
  return null
}

function healthOf(
  expiresAt: number | null,
  rejects: number,
  now: number,
): CredentialHealth {
  if (expiresAt !== null && expiresAt <= now) return "expired"
  if (rejects >= config.social.staleAfterRejects) return "stale"
  if (expiresAt !== null && expiresAt - now <= EXPIRING_SOON_DAYS * DAY_MS) {
    return "expiring"
  }
  return "healthy"
}

/**
 * Most recent run touching each provider. A social (cookie) credential is
 * matched on the run's SOURCE, because that is the credential the download
 * step reaches for — the provider id of a cookie credential IS the media
 * source id (SESSION_AUTH.md §2.4), so no mapping table is needed.
 */
function lastUsed(
  facts: RunFact[],
): Map<string, { at: number; basis: ConnectedApp["lastUsedBasis"] }> {
  const seen = new Map<
    string,
    { at: number; basis: ConnectedApp["lastUsedBasis"] }
  >()
  const mark = (
    provider: string | null,
    at: number,
    basis: ConnectedApp["lastUsedBasis"],
  ) => {
    if (!provider) return
    const current = seen.get(provider)
    if (!current || at > current.at) seen.set(provider, { at, basis })
  }

  for (const fact of facts) {
    for (const use of fact.models) mark(use.provider, fact.createdAt, "model")
    mark(fact.publishProvider, fact.createdAt, "publish")
    mark(fact.source, fact.createdAt, "source")
  }
  return seen
}

export async function buildConnectedApps(
  userId: string,
  facts: RunFact[],
  now = Date.now(),
): Promise<ConnectedApp[]> {
  const rows = await getDb()
    .select({
      id: credentials.id,
      provider: credentials.provider,
      type: credentials.type,
      metaData: credentials.metaData,
      additionalData: credentials.additionalData,
      expiresAt: credentials.expiresAt,
      isActive: credentials.isActive,
      createdAt: credentials.createdAt,
    })
    .from(credentials)
    .where(eq(credentials.userId, userId))
    .orderBy(asc(credentials.createdAt))
    .all()

  const used = lastUsed(facts)

  return rows.map((row) => {
    const rejects = row.additionalData?.reject_count
    const rejectCount = typeof rejects === "number" ? rejects : 0
    const last = used.get(row.provider) ?? null
    return {
      id: row.id,
      provider: row.provider,
      providerLabel: providerLabel(row.provider),
      type: row.type,
      account: accountOf(row.metaData),
      active: row.isActive,
      health: healthOf(row.expiresAt, rejectCount, now),
      rejectCount,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      lastUsedAt: last?.at ?? null,
      lastUsedBasis: last?.basis ?? null,
    }
  })
}

import { and, eq } from "drizzle-orm"

import { decrypt } from "@/lib/crypto"
import { getDb } from "@/lib/db"
import { type CredentialType, credentials } from "@/lib/db/schema"
import { logger } from "@/lib/observability/logger"

/**
 * Type-scoped secret reads (SESSION_AUTH.md §3.6).
 *
 * Split from src/lib/vault.ts only to keep that file under the 250-line
 * cap (RULES.md) — this is the same vault, same encryption, same rules:
 * the decrypted value is returned to pipeline code and NEVER logged,
 * returned by an API, or written to a run record.
 *
 * `getAccessToken` (src/lib/vault.ts) filters on (user, provider) alone
 * and takes the first row. That is unambiguous only while a provider has
 * exactly one credential. Social sessions break the assumption — a
 * provider id is a MediaSourceId there, and a user could hold both a
 * cookie jar and some future credential for the same source — so callers
 * that care WHICH KIND of secret they are asking for use this instead.
 */

export interface StoredSecret {
  /** Lets the caller write bookkeeping back without a second lookup. */
  credentialId: string
  /** Decrypted. Treat as radioactive: never log, never serialize out. */
  secret: string
  /** Plaintext metadata — generic `account_*` keys only. */
  metaData: Record<string, unknown> | null
  /**
   * For a social session this is the earliest expiry among the cookies
   * that constitute the session: a floor on uselessness, NOT a promise of
   * validity. A session can be revoked server-side long before this.
   */
  expiresAt: number | null
  /** Operational bookkeeping (reject counts, last verified) — never shown. */
  additionalData: Record<string, unknown>
}

export async function getSecretByType(
  provider: string,
  userId: string,
  type: CredentialType,
): Promise<StoredSecret | null> {
  const row = await getDb()
    .select({
      id: credentials.id,
      accessToken: credentials.accessToken,
      iv: credentials.iv,
      metaData: credentials.metaData,
      expiresAt: credentials.expiresAt,
      additionalData: credentials.additionalData,
    })
    .from(credentials)
    .where(
      and(
        eq(credentials.userId, userId),
        eq(credentials.provider, provider),
        eq(credentials.type, type),
      ),
    )
    .get()
  if (!row) return null

  return {
    credentialId: row.id,
    secret: await decrypt(row.accessToken, row.iv),
    metaData: row.metaData,
    expiresAt: row.expiresAt,
    additionalData: row.additionalData,
  }
}

/**
 * Staleness bookkeeping for a social session (SESSION_AUTH.md §4.3).
 *
 * Lives in `additional_data`, which is deliberately absent from
 * `MASKED_COLUMNS` (src/lib/vault.ts) — the raw counter is operational
 * state, never something the API hands to a browser. The Vault reads only
 * the derived "is this stale" bit.
 *
 * Read-modify-write rather than a SQL increment so any other keys a future
 * caller parks in `additional_data` survive. Best-effort by design: a
 * failed write costs a nag, never a run, so it never throws.
 */
export async function recordSessionOutcome(
  credentialId: string,
  userId: string,
  outcome: "accepted" | "rejected",
): Promise<void> {
  try {
    const db = getDb()
    const row = await db
      .select({ additionalData: credentials.additionalData })
      .from(credentials)
      .where(
        and(eq(credentials.id, credentialId), eq(credentials.userId, userId)),
      )
      .get()
    if (!row) return

    const current = row.additionalData ?? {}
    const previous =
      typeof current.reject_count === "number" ? current.reject_count : 0
    const next =
      outcome === "rejected"
        ? {
            ...current,
            reject_count: previous + 1,
            last_rejected_at: Date.now(),
          }
        : // A success is proof the jar is alive, so the counter resets
          // outright — two rejections a month apart are not a trend.
          { ...current, reject_count: 0, last_verified_at: Date.now() }

    await db
      .update(credentials)
      .set({ additionalData: next })
      .where(
        and(eq(credentials.id, credentialId), eq(credentials.userId, userId)),
      )
      .run()
  } catch (error) {
    logger.warn("Could not record social session outcome", {
      credential_id: credentialId,
      outcome,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Just the id, without decrypting anything (SESSION_AUTH.md §5.3).
 *
 * The rate budget runs on every job pickup and only needs to know WHICH
 * account a run would spend against. `getSecretByType` would decrypt the
 * whole jar to answer that, putting cookie material in memory on a code
 * path that has no business holding it.
 */
export async function getCredentialIdByType(
  provider: string,
  userId: string,
  type: CredentialType,
): Promise<string | null> {
  const row = await getDb()
    .select({ id: credentials.id })
    .from(credentials)
    .where(
      and(
        eq(credentials.userId, userId),
        eq(credentials.provider, provider),
        eq(credentials.type, type),
      ),
    )
    .get()
  return row?.id ?? null
}

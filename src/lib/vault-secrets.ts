import { and, eq } from "drizzle-orm"

import { decrypt } from "@/lib/crypto"
import { getDb } from "@/lib/db"
import { type CredentialType, credentials } from "@/lib/db/schema"

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

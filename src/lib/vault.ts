import { and, eq } from "drizzle-orm"

import { decrypt, encrypt } from "@/lib/crypto"
import { getDb } from "@/lib/db"
import { credentials, users } from "@/lib/db/schema"
import type { CredentialInput } from "@/lib/schemas"

/**
 * Credential vault service (TRD §4, PRD §4.4).
 *
 * `access_token` is encrypted with the record's `iv` column. A GCM IV must
 * never be reused under the same key, so `refresh_token` (when present) is
 * stored self-contained as `ivHex:cipherB64` with its own random IV.
 * `meta_data` stays plaintext JSON. Tokens are never logged or returned.
 */

const LOCAL_USER = { id: "local", email: "local@relay.app" }

export function ensureLocalUser(): string {
  getDb()
    .insert(users)
    .values({ ...LOCAL_USER, createdAt: Date.now() })
    .onConflictDoNothing()
    .run()
  return LOCAL_USER.id
}

export interface MaskedCredential {
  id: string
  type: "api_key" | "oauth"
  provider: string
  expiresAt: number | null
  metaData: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
}

const MASKED_COLUMNS = {
  id: credentials.id,
  type: credentials.type,
  provider: credentials.provider,
  expiresAt: credentials.expiresAt,
  metaData: credentials.metaData,
  createdAt: credentials.createdAt,
  updatedAt: credentials.updatedAt,
}

export function listCredentials(): MaskedCredential[] {
  const userId = ensureLocalUser()
  return getDb()
    .select(MASKED_COLUMNS)
    .from(credentials)
    .where(eq(credentials.userId, userId))
    .orderBy(credentials.createdAt)
    .all()
}

export async function createCredential(
  input: CredentialInput,
): Promise<MaskedCredential> {
  const userId = ensureLocalUser()
  const db = getDb()
  const access = await encrypt(input.accessToken)
  let refreshToken: string | null = null
  if (input.refreshToken) {
    const refresh = await encrypt(input.refreshToken)
    refreshToken = `${refresh.iv}:${refresh.ciphertext}`
  }
  const now = Date.now()

  // One credential per provider for the single local user: replace on repeat.
  db.delete(credentials)
    .where(
      and(
        eq(credentials.userId, userId),
        eq(credentials.provider, input.provider),
      ),
    )
    .run()

  const [row] = db
    .insert(credentials)
    .values({
      id: crypto.randomUUID(),
      userId,
      type: input.type,
      provider: input.provider,
      accessToken: access.ciphertext,
      refreshToken,
      expiresAt: input.expiresAt ?? null,
      metaData: input.metaData ?? null,
      iv: access.iv,
      createdAt: now,
      updatedAt: now,
    })
    .returning(MASKED_COLUMNS)
    .all()
  return row
}

export function deleteCredential(id: string): boolean {
  const userId = ensureLocalUser()
  const deleted = getDb()
    .delete(credentials)
    .where(and(eq(credentials.id, id), eq(credentials.userId, userId)))
    .returning({ id: credentials.id })
    .all()
  return deleted.length > 0
}

/** Decrypt the stored access token for a provider (pipeline use only). */
export async function getAccessToken(provider: string): Promise<string | null> {
  const userId = ensureLocalUser()
  const row = getDb()
    .select({ accessToken: credentials.accessToken, iv: credentials.iv })
    .from(credentials)
    .where(
      and(eq(credentials.userId, userId), eq(credentials.provider, provider)),
    )
    .get()
  if (!row) return null
  return decrypt(row.accessToken, row.iv)
}

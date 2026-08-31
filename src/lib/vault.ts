import { and, eq, sql } from "drizzle-orm"

import { decrypt, encrypt } from "@/lib/crypto"
import { getDb } from "@/lib/db"
import { credentials } from "@/lib/db/schema"
import type { CredentialInput } from "@/lib/schemas"

/**
 * Credential vault service (TRD §4, PRD §4.4).
 *
 * `access_token` is encrypted with the record's `iv` column. A GCM IV must
 * never be reused under the same key, so `refresh_token` (when present) is
 * stored self-contained as `ivHex:cipherB64` with its own random IV.
 * `meta_data` stays plaintext JSON. Tokens are never logged or returned.
 */

export interface MaskedCredential {
  id: string
  /** User-chosen label, stored in plaintext meta_data (never the secret). */
  label: string | null
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

type MaskedRow = {
  id: string
  type: "api_key" | "oauth"
  provider: string
  expiresAt: number | null
  metaData: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
}

/** Lifts the user-chosen label out of plaintext meta_data. */
function toMasked(row: MaskedRow): MaskedCredential {
  const label = row.metaData?.label
  return {
    ...row,
    label: typeof label === "string" && label.length > 0 ? label : null,
  }
}

export async function listCredentials(
  userId: string,
): Promise<MaskedCredential[]> {
  const rows = await getDb()
    .select(MASKED_COLUMNS)
    .from(credentials)
    .where(eq(credentials.userId, userId))
    .orderBy(credentials.createdAt)
    .all()
  return rows.map(toMasked)
}

export async function createCredential(
  input: CredentialInput,
  userId: string,
): Promise<MaskedCredential> {
  const db = getDb()
  const access = await encrypt(input.accessToken)
  let refreshToken: string | null = null
  if (input.refreshToken) {
    const refresh = await encrypt(input.refreshToken)
    refreshToken = `${refresh.iv}:${refresh.ciphertext}`
  }
  const now = Date.now()

  // Replace scope: API keys are one-per-provider; Ray credentials are
  // one-per-account, keyed on the provider-agnostic `account_id` meta key
  // (every registry entry maps its own concept onto it), so multiple
  // accounts of one provider coexist and reconnecting updates in place.
  const accountId = input.metaData?.account_id
  if (input.type === "api_key") {
    await db
      .delete(credentials)
      .where(
        and(
          eq(credentials.userId, userId),
          eq(credentials.provider, input.provider),
          eq(credentials.type, "api_key"),
        ),
      )
      .run()
  } else if (typeof accountId === "string" && accountId.length > 0) {
    await db
      .delete(credentials)
      .where(
        and(
          eq(credentials.userId, userId),
          eq(credentials.provider, input.provider),
          sql`json_extract(${credentials.metaData}, '$.account_id') = ${accountId}`,
        ),
      )
      .run()
  }

  const [row] = await db
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
  return toMasked(row)
}

/**
 * Updates the plaintext metadata a user controls: the display label and,
 * for API keys, which account the key was generated from.
 *
 * Both live in `meta_data`, which is plaintext JSON by design (TRD §4), so
 * no migration is needed and nothing secret goes near it. `account_name`
 * is the same generic key the Ray registry populates for OAuth rows, so
 * the Account column renders identically for both kinds of credential.
 *
 * Read-modify-write, so provider metadata (account_id and friends)
 * survives an edit. Passing an empty string clears a field.
 */
export interface CredentialMetaPatch {
  label?: string
  accountName?: string
}

export async function updateCredentialMeta(
  id: string,
  userId: string,
  patch: CredentialMetaPatch,
): Promise<MaskedCredential | null> {
  const db = getDb()
  const current = await db
    .select({ metaData: credentials.metaData })
    .from(credentials)
    .where(and(eq(credentials.id, id), eq(credentials.userId, userId)))
    .get()
  if (!current) return null

  const meta = { ...(current.metaData ?? {}) }
  const apply = (key: string, value: string | undefined) => {
    if (value === undefined) return
    const trimmed = value.trim()
    if (trimmed.length > 0) meta[key] = trimmed
    else delete meta[key]
  }
  apply("label", patch.label)
  apply("account_name", patch.accountName)

  const [row] = await db
    .update(credentials)
    .set({ metaData: meta, updatedAt: Date.now() })
    .where(and(eq(credentials.id, id), eq(credentials.userId, userId)))
    .returning(MASKED_COLUMNS)
    .all()
  return row ? toMasked(row) : null
}

/**
 * Rotates the stored secret. A fresh IV is generated for the new value —
 * reusing the record's existing IV under the same key would be GCM nonce
 * reuse, which is catastrophic rather than merely untidy.
 */
export async function updateCredentialSecret(
  id: string,
  userId: string,
  accessToken: string,
): Promise<MaskedCredential | null> {
  const encrypted = await encrypt(accessToken)
  const [row] = await getDb()
    .update(credentials)
    .set({
      accessToken: encrypted.ciphertext,
      iv: encrypted.iv,
      updatedAt: Date.now(),
    })
    .where(and(eq(credentials.id, id), eq(credentials.userId, userId)))
    .returning(MASKED_COLUMNS)
    .all()
  return row ? toMasked(row) : null
}

export async function deleteCredential(
  id: string,
  userId: string,
): Promise<boolean> {
  const deleted = await getDb()
    .delete(credentials)
    .where(and(eq(credentials.id, id), eq(credentials.userId, userId)))
    .returning({ id: credentials.id })
    .all()
  return deleted.length > 0
}

/** Decrypt the stored access token for a provider (pipeline use only). */
export async function getAccessToken(
  provider: string,
  userId: string,
): Promise<string | null> {
  const row = await getDb()
    .select({ accessToken: credentials.accessToken, iv: credentials.iv })
    .from(credentials)
    .where(
      and(eq(credentials.userId, userId), eq(credentials.provider, provider)),
    )
    .get()
  if (!row) return null
  return decrypt(row.accessToken, row.iv)
}

import { and, asc, eq } from "drizzle-orm"

import { decrypt } from "@/lib/crypto"
import { getDb } from "@/lib/db"
import { credentials } from "@/lib/db/schema"
import { getCredentialChain } from "@/lib/settings"

/**
 * Which of a provider's credentials the pipeline uses (RULES.md: provider
 * vocabulary never leaks — this is keyed on the generic provider id only).
 *
 * A provider may hold several credentials: two API keys from different
 * accounts, two Notion workspaces, two YouTube sessions. Every read path
 * resolves through `orderCredentials` so the whole app agrees on the
 * ORDER — the user's pick first, then the rest oldest-first — instead of
 * whatever SQLite happened to return.
 *
 * Callers that can only use one credential take the head of that order.
 * Callers that can retry (extraction, transcription) walk it, which is
 * what makes a second account a fallback for a rate-limited or dead key.
 */

export async function orderCredentials<T extends { id: string }>(
  userId: string,
  rows: readonly T[],
): Promise<T[]> {
  if (rows.length < 2) return [...rows]
  // One provider's slice of a chain. EXTRACTION's, because these callers
  // are not chat stages at all — the Notion Ray, transcription, a session
  // jar — and extraction is the order a user actually curates. It only
  // decides which of ONE provider's accounts is reached first.
  return applyOrder(rows, await getCredentialChain(userId, "extraction"))
}

/**
 * `rows` must already be oldest-first: that is what anything the stored
 * order does not mention falls back to, so a newly added credential lands
 * at the end of the chain instead of jumping it.
 */
function applyOrder<T extends { id: string }>(
  rows: readonly T[],
  ids: readonly string[] | undefined,
): T[] {
  if (!ids || ids.length === 0) return [...rows]
  const byId = new Map(rows.map((row) => [row.id, row]))
  const ordered: T[] = []
  for (const id of ids) {
    const row = byId.get(id)
    if (!row) continue
    byId.delete(id)
    ordered.push(row)
  }
  return [...ordered, ...rows.filter((row) => byId.has(row.id))]
}

export async function pickCredential<T extends { id: string }>(
  userId: string,
  rows: readonly T[],
): Promise<T | null> {
  return (await orderCredentials(userId, rows))[0] ?? null
}

/**
 * Switches a credential in or out of the fallback chain. The stored order
 * is left alone: a credential switched off keeps its place (only
 * `resolveChain` filters it), so switching it back on restores exactly
 * where the user had put it. One the chain has never heard of is appended
 * by the reader's reconciliation.
 */
export async function setCredentialActive(
  id: string,
  userId: string,
  isActive: boolean,
): Promise<string | null> {
  const [row] = await getDb()
    .update(credentials)
    .set({ isActive, updatedAt: Date.now() })
    .where(and(eq(credentials.id, id), eq(credentials.userId, userId)))
    .returning({ provider: credentials.provider })
    .all()
  return row?.provider ?? null
}

/** Switched-off credentials are absent from every pipeline read path. */
function secretRows(provider: string, userId: string) {
  return getDb()
    .select({
      id: credentials.id,
      accessToken: credentials.accessToken,
      iv: credentials.iv,
      updatedAt: credentials.updatedAt,
    })
    .from(credentials)
    .where(
      and(
        eq(credentials.userId, userId),
        eq(credentials.provider, provider),
        eq(credentials.isActive, true),
      ),
    )
    .orderBy(asc(credentials.createdAt))
    .all()
}

/** Decrypt ONE credential by id, for a chain that already picked it. */
export async function accessTokenById(
  credentialId: string,
  userId: string,
): Promise<string | null> {
  const row = await getDb()
    .select({ accessToken: credentials.accessToken, iv: credentials.iv })
    .from(credentials)
    .where(
      and(
        eq(credentials.id, credentialId),
        eq(credentials.userId, userId),
        eq(credentials.isActive, true),
      ),
    )
    .get()
  if (!row) return null
  return decrypt(row.accessToken, row.iv)
}

export interface ProviderKey {
  credentialId: string
  /** Decrypted. Treat as radioactive: never log, never serialize out. */
  apiKey: string
}

/**
 * Every key a provider holds, in fallback order (pipeline use only).
 *
 * All of them are decrypted up front. A chain has to be walkable in order,
 * and these are the same user's own keys — a lazy thunk per entry would
 * buy nothing but indirection.
 */
export async function orderedProviderKeys(
  provider: string,
  userId: string,
): Promise<ProviderKey[]> {
  const ordered = await orderCredentials(
    userId,
    await secretRows(provider, userId),
  )
  return Promise.all(
    ordered.map(async (row) => ({
      credentialId: row.id,
      apiKey: await decrypt(row.accessToken, row.iv),
    })),
  )
}

/** Decrypt the preferred access token for a provider (pipeline use only). */
export async function getAccessToken(
  provider: string,
  userId: string,
): Promise<string | null> {
  const row = await pickCredential(userId, await secretRows(provider, userId))
  if (!row) return null
  return decrypt(row.accessToken, row.iv)
}

/**
 * Rotation signal for the model catalog cache. The NEWEST `updated_at`
 * across the provider's credentials, not the selected one's — the cache
 * row is per (user, provider) and the fallback chain walks several keys,
 * so a per-key stamp would make every fallback invalidate the snapshot the
 * next run needs.
 */
export async function providerCredentialStamp(
  provider: string,
  userId: string,
): Promise<number> {
  const rows = await secretRows(provider, userId)
  return rows.reduce((newest, row) => Math.max(newest, row.updatedAt), 0)
}

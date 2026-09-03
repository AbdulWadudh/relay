import { and, asc, eq } from "drizzle-orm"

import { decrypt } from "@/lib/crypto"
import { getDb } from "@/lib/db"
import { credentials } from "@/lib/db/schema"
import { getCredentialSelection, setCredentialSelection } from "@/lib/settings"

/**
 * Which of a provider's credentials the pipeline uses (RULES.md: provider
 * vocabulary never leaks — this is keyed on the generic provider id only).
 *
 * A provider may hold several credentials: two API keys from different
 * accounts, two Notion workspaces, two YouTube sessions. Every read path
 * resolves through `orderForProvider` so the whole app agrees on the
 * ORDER — the user's pick first, then the rest oldest-first — instead of
 * whatever SQLite happened to return.
 *
 * Callers that can only use one credential take the head of that order.
 * Callers that can retry (extraction, transcription) walk it, which is
 * what makes a second account a fallback for a rate-limited or dead key.
 */

export async function orderForProvider<T extends { id: string }>(
  userId: string,
  provider: string,
  rows: readonly T[],
): Promise<T[]> {
  if (rows.length < 2) return [...rows]
  const selected = (await getCredentialSelection(userId))[provider]
  const head = rows.find((row) => row.id === selected)
  if (!head) return [...rows]
  return [head, ...rows.filter((row) => row.id !== head.id)]
}

export async function pickForProvider<T extends { id: string }>(
  userId: string,
  provider: string,
  rows: readonly T[],
): Promise<T | null> {
  return (await orderForProvider(userId, provider, rows))[0] ?? null
}

/** Marks a credential as the first its provider reaches for. */
export async function selectCredential(
  id: string,
  userId: string,
): Promise<string | null> {
  const row = await getDb()
    .select({ provider: credentials.provider })
    .from(credentials)
    .where(and(eq(credentials.id, id), eq(credentials.userId, userId)))
    .get()
  if (!row) return null
  await setCredentialSelection(userId, row.provider, id)
  return row.provider
}

/**
 * Switches a credential in or out of its provider's chain. Switching one
 * on also makes it preferred — the only reason to re-enable a key is to
 * use it, and it would otherwise sit behind whatever took over.
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
  if (!row) return null
  if (isActive) await setCredentialSelection(userId, row.provider, id)
  return row.provider
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
  const ordered = await orderForProvider(
    userId,
    provider,
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
  const row = await pickForProvider(
    userId,
    provider,
    await secretRows(provider, userId),
  )
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

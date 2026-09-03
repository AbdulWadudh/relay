import { and, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { credentials, userSettings } from "@/lib/db/schema"
import { chatProvider, EXTRACTION_ORDER } from "@/lib/extraction/providers"
import { type AiKeyProviderId, isKeylessProvider } from "@/lib/providers"

/**
 * Per-user preferences, stored in `user_settings` (one row per user+key).
 *
 * Deliberately a thin key/value layer: each preference owns its shape and
 * is validated by its own Zod schema at the API boundary, not by the
 * column. Nothing secret is stored here — the value is plaintext JSON.
 */

export const SETTING_KEYS = {
  extractionOrder: "extraction_order",
  shareAutoRun: "share_auto_run",
  credentialSelection: "credential_selection",
} as const

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS]

async function readSetting(
  userId: string,
  key: SettingKey,
): Promise<unknown | null> {
  const row = await getDb()
    .select({ value: userSettings.value })
    .from(userSettings)
    .where(and(eq(userSettings.userId, userId), eq(userSettings.key, key)))
    .get()
  return row?.value ?? null
}

/** Upsert on the (user_id, key) unique index — one row per preference. */
export async function writeSetting(
  userId: string,
  key: SettingKey,
  value: unknown,
): Promise<void> {
  const now = Date.now()
  await getDb()
    .insert(userSettings)
    .values({
      id: crypto.randomUUID(),
      userId,
      key,
      value,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userSettings.userId, userSettings.key],
      set: { value, updatedAt: now },
    })
    .run()
}

/**
 * The user's provider order, reconciled against the code's own list.
 *
 * Reconciliation is the point of this function rather than returning the
 * stored array verbatim. A saved order is a snapshot of the providers that
 * existed the day it was saved, so:
 *
 *  - ids no longer in EXTRACTION_ORDER are DROPPED (a provider removed
 *    from the codebase must not resurrect itself from a stale row), and
 *  - ids the user has never seen are APPENDED in their default relative
 *    order (a newly added provider must not be invisible until they
 *    happen to revisit the settings page).
 *
 * Falls back to EXTRACTION_ORDER when nothing is stored or the row is
 * malformed — a broken preference must never stop extraction.
 */
export async function resolveExtractionOrder(
  userId: string,
): Promise<readonly AiKeyProviderId[]> {
  const stored = await readSetting(userId, SETTING_KEYS.extractionOrder)
  if (!Array.isArray(stored)) return EXTRACTION_ORDER

  const known = new Set<string>(EXTRACTION_ORDER)
  const chosen = stored.filter(
    (id): id is AiKeyProviderId => typeof id === "string" && known.has(id),
  )
  if (chosen.length === 0) return EXTRACTION_ORDER

  const seen = new Set<string>(chosen)
  return [...chosen, ...EXTRACTION_ORDER.filter((id) => !seen.has(id))]
}

/**
 * What the settings UI renders: this user's order, narrowed to providers
 * they can ACTUALLY use.
 *
 * A provider qualifies when it is registered in the chat registry (not
 * every AI_KEY_PROVIDERS entry has a chat endpoint) AND either it
 * needs no credential (local Ollama) or the user has stored a key for it.
 *
 * Listing the rest would be a lie: reordering a provider you have no key
 * for changes nothing, because the runtime skips it. The stored order is
 * left untouched — `resolveExtractionOrder` re-appends anything filtered
 * out here, so adding a key later restores that provider's saved position
 * instead of resetting it.
 */
export async function getExtractionOrder(
  userId: string,
): Promise<readonly AiKeyProviderId[]> {
  const order = await resolveExtractionOrder(userId)

  const rows = await getDb()
    .select({ provider: credentials.provider })
    .from(credentials)
    .where(and(eq(credentials.userId, userId), eq(credentials.type, "api_key")))
    .all()
  const configured = new Set(rows.map((row) => row.provider))

  return order.filter(
    (id) =>
      chatProvider(id) !== null &&
      (isKeylessProvider(id) || configured.has(id)),
  )
}

/**
 * Whether a link arriving from the Android share sheet is queued on sight.
 *
 * Defaults to FALSE: a share is one tap away from any app, so running on
 * arrival makes a mis-tap cost a real download and a real LLM call.
 */
export async function getShareAutoRun(userId: string): Promise<boolean> {
  return (await readSetting(userId, SETTING_KEYS.shareAutoRun)) === true
}

/**
 * Which credential a provider uses when several are stored, as
 * `{ [provider]: credentialId }`. Selection is a preference, not vault
 * state, so it lives here rather than as a column with a "one row is
 * primary" invariant to keep true.
 */
export async function getCredentialSelection(
  userId: string,
): Promise<Record<string, string>> {
  const stored = await readSetting(userId, SETTING_KEYS.credentialSelection)
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {}

  const selection: Record<string, string> = {}
  for (const [provider, id] of Object.entries(stored)) {
    if (typeof id === "string" && id.length > 0) selection[provider] = id
  }
  return selection
}

export async function setCredentialSelection(
  userId: string,
  provider: string,
  credentialId: string,
): Promise<void> {
  const current = await getCredentialSelection(userId)
  await writeSetting(userId, SETTING_KEYS.credentialSelection, {
    ...current,
    [provider]: credentialId,
  })
}

/** Drops any provider pointing at a credential that no longer exists. */
export async function forgetCredentialSelection(
  userId: string,
  credentialId: string,
): Promise<void> {
  const current = await getCredentialSelection(userId)
  const next = Object.fromEntries(
    Object.entries(current).filter(([, id]) => id !== credentialId),
  )
  if (Object.keys(next).length === Object.keys(current).length) return
  await writeSetting(userId, SETTING_KEYS.credentialSelection, next)
}

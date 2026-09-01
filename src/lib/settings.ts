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
  /** Order the extraction stage tries chat providers in. */
  extractionOrder: "extraction_order",
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

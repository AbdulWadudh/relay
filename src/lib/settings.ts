import { and, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { userSettings } from "@/lib/db/schema"
import { EXTRACTION_ORDER } from "@/lib/extraction/providers"
import { CHAT_STAGE_IDS, type ChatStage } from "@/lib/extraction/stages"
import type { AiKeyProviderId } from "@/lib/providers"

/**
 * Per-user preferences, stored in `user_settings` (one row per user+key).
 *
 * Deliberately a thin key/value layer: each preference owns its shape and
 * is validated by its own Zod schema at the API boundary, not by the
 * column. Nothing secret is stored here — the value is plaintext JSON.
 */

export const SETTING_KEYS = {
  /**
   * The order credentials are tried in, PER STAGE:
   * `{ [ChatStage]: credentialId[] }`. Flat within a stage, so two
   * accounts of one provider can sit either side of another provider's.
   *
   * Still read when it holds a bare array — that was the shape before
   * stages existed, and it then seeds every stage alike.
   */
  credentialChain: "credential_chain",
  stageModels: "stage_models",
  shareAutoRun: "share_auto_run",
  /**
   * Superseded by credentialChain, still read to SEED it so an order set
   * before the flat chain existed is not silently discarded.
   */
  extractionOrder: "extraction_order",
  credentialOrder: "credential_order",
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
 * Provider-level order, reconciled against the code's own list.
 *
 * No longer what the pipeline reads — `resolveChain`
 * (src/lib/extraction/chain.ts) does, and it is per-ACCOUNT. This survives
 * as the SEED for a user who has never touched the flat chain, so the
 * provider order they set earlier still decides where their accounts start
 * out.
 *
 * Ids no longer in EXTRACTION_ORDER are dropped (a provider removed from
 * the codebase must not resurrect itself from a stale row); ids the user
 * has never seen are appended in their default relative order.
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
 * The stored credential chain, verbatim apart from junk filtering. Every
 * reader reconciles it against reality itself — `resolveChain` for the
 * pipeline, `orderCredentials` for one provider's slice — because an id
 * can be deleted or switched off between two reads of this row.
 *
 * Seeded from the two earlier keys when it is empty, so an order set
 * before the flat chain existed still applies.
 */
export async function getCredentialChain(
  userId: string,
  stage: ChatStage,
): Promise<string[]> {
  const stored = await readSetting(userId, SETTING_KEYS.credentialChain)

  // A bare array is the pre-stage shape. It applies to every stage, so an
  // order set before this existed is not silently dropped.
  if (Array.isArray(stored)) {
    const flat = cleanIds(stored)
    if (flat.length > 0) return flat
  } else if (stored && typeof stored === "object") {
    const perStage = cleanIds((stored as Record<string, unknown>)[stage])
    if (perStage.length > 0) return perStage
  }

  return legacyChainSeed(userId)
}

function cleanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  )
}

/**
 * `credential_order` was `{ [provider]: id[] }` and `credential_selection`
 * was `{ [provider]: id }`. Flattened in provider order, they are already
 * a valid chain — anything they omit gets appended by the reader.
 */
async function legacyChainSeed(userId: string): Promise<string[]> {
  const [order, selection] = await Promise.all([
    readSetting(userId, SETTING_KEYS.credentialOrder),
    readSetting(userId, SETTING_KEYS.credentialSelection),
  ])
  const perProvider = new Map<string, string[]>()
  if (order && typeof order === "object" && !Array.isArray(order)) {
    for (const [provider, ids] of Object.entries(order)) {
      if (!Array.isArray(ids)) continue
      const clean = ids.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      )
      if (clean.length > 0) perProvider.set(provider, clean)
    }
  }
  if (selection && typeof selection === "object" && !Array.isArray(selection)) {
    for (const [provider, id] of Object.entries(selection)) {
      if (typeof id === "string" && id.length > 0 && !perProvider.has(provider))
        perProvider.set(provider, [id])
    }
  }
  if (perProvider.size === 0) return []

  const providers = await resolveExtractionOrder(userId)
  const seed: string[] = []
  for (const provider of providers)
    seed.push(...(perProvider.get(provider) ?? []))
  for (const [provider, ids] of perProvider) {
    if (!providers.includes(provider as AiKeyProviderId)) seed.push(...ids)
  }
  return seed
}

/**
 * Read-modify-write over the whole map, and the bare-array shape is
 * expanded first — writing one stage must not discard the order the other
 * three inherited from it.
 */
export async function setCredentialChain(
  userId: string,
  stage: ChatStage,
  chain: readonly string[],
): Promise<void> {
  await writeSetting(userId, SETTING_KEYS.credentialChain, {
    ...(await allCredentialChains(userId)),
    [stage]: [...chain],
  })
}

export async function allCredentialChains(
  userId: string,
): Promise<Record<string, string[]>> {
  const stored = await readSetting(userId, SETTING_KEYS.credentialChain)

  if (Array.isArray(stored)) {
    const flat = cleanIds(stored)
    if (flat.length === 0) return {}
    return Object.fromEntries(CHAT_STAGE_IDS.map((id) => [id, [...flat]]))
  }
  if (!stored || typeof stored !== "object") return {}

  const chains: Record<string, string[]> = {}
  for (const [stage, ids] of Object.entries(stored)) {
    const clean = cleanIds(ids)
    if (clean.length > 0) chains[stage] = clean
  }
  return chains
}

/** Drops a deleted credential from every stage's chain. */
export async function forgetCredentialChain(
  userId: string,
  credentialId: string,
): Promise<void> {
  const chains = await allCredentialChains(userId)
  let changed = false
  const next: Record<string, string[]> = {}
  for (const [stage, ids] of Object.entries(chains)) {
    const kept = ids.filter((id) => id !== credentialId)
    if (kept.length !== ids.length) changed = true
    if (kept.length > 0) next[stage] = kept
  }
  if (!changed) return
  await writeSetting(userId, SETTING_KEYS.credentialChain, next)
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

export async function getStageModels(
  userId: string,
  stage: ChatStage,
): Promise<Record<string, string>> {
  const stored = await readSetting(userId, SETTING_KEYS.stageModels)
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {}
  const forStage = (stored as Record<string, unknown>)[stage]
  if (!forStage || typeof forStage !== "object" || Array.isArray(forStage)) {
    return {}
  }

  const pins: Record<string, string> = {}
  for (const [entryId, modelId] of Object.entries(forStage)) {
    if (typeof modelId === "string" && modelId.length > 0) {
      pins[entryId] = modelId
    }
  }
  return pins
}

/** `null` unpins, which is how "let the ranker choose" is expressed. */
export async function setStageModel(
  userId: string,
  stage: ChatStage,
  entryId: string,
  modelId: string | null,
): Promise<void> {
  const stored = await readSetting(userId, SETTING_KEYS.stageModels)
  const all =
    stored && typeof stored === "object" && !Array.isArray(stored)
      ? { ...(stored as Record<string, Record<string, string>>) }
      : {}

  const forStage = { ...(await getStageModels(userId, stage)) }
  if (modelId) forStage[entryId] = modelId
  else delete forStage[entryId]

  all[stage] = forStage
  await writeSetting(userId, SETTING_KEYS.stageModels, all)
}

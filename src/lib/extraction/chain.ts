import { and, asc, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { credentials } from "@/lib/db/schema"
import { chatProvider } from "@/lib/extraction/providers"
import type { ChatStage } from "@/lib/extraction/stages"
import type { AiKeyProviderId } from "@/lib/providers"
import { getCredentialChain, resolveExtractionOrder } from "@/lib/settings"

/**
 * The extraction fallback chain: a FLAT list of accounts across every
 * provider (human decision 2026-09-04).
 *
 * It used to be two nested orders — providers, then each provider's
 * accounts — which meant all of one provider's accounts had to be tried
 * before any of another's. They are one list now, so a second Gemini key
 * can sit behind Groq rather than ahead of it.
 *
 * The stored array is never authoritative on its own: entries that no
 * longer exist, or belong to a provider this deploy cannot reach, are
 * dropped, and accounts it does not mention are appended in the default
 * order. So adding a key never requires visiting Settings, and a stale row
 * can never strand the pipeline.
 *
 * A SWITCHED-OFF account stays in the chain, carrying `active: false`. The
 * pipeline skips it; Settings renders it in place, greyed. Dropping it here
 * instead made it vanish from the list, which left no way to see where it
 * would land once switched back on.
 */

export interface ChainEntry {
  /** Credential id, or the provider id when the provider holds no key. */
  id: string
  provider: AiKeyProviderId
  /** null for local Ollama, which is reached without a credential. */
  credentialId: string | null
  /** False means the pipeline skips it, but it keeps its place. */
  active: boolean
}

/**
 * Every account extraction could use, in the DEFAULT order: providers in
 * the user's provider-level preference (itself defaulting to
 * EXTRACTION_ORDER), each one's accounts oldest-first.
 */
async function candidates(userId: string): Promise<ChainEntry[]> {
  const rows = await getDb()
    .select({
      id: credentials.id,
      provider: credentials.provider,
      isActive: credentials.isActive,
    })
    .from(credentials)
    .where(and(eq(credentials.userId, userId), eq(credentials.type, "api_key")))
    .orderBy(asc(credentials.createdAt))
    .all()

  const byProvider = new Map<string, typeof rows>()
  for (const row of rows) {
    const group = byProvider.get(row.provider)
    if (group) group.push(row)
    else byProvider.set(row.provider, [row])
  }

  const entries: ChainEntry[] = []
  for (const id of await resolveExtractionOrder(userId)) {
    const provider = chatProvider(id)
    if (!provider) continue
    if (provider.keyless) {
      entries.push({ id, provider: id, credentialId: null, active: true })
      continue
    }
    for (const row of byProvider.get(id) ?? []) {
      entries.push({
        id: row.id,
        provider: id,
        credentialId: row.id,
        active: row.isActive,
      })
    }
  }
  return entries
}

/**
 * Per STAGE, because the account that should answer a routing question is
 * not necessarily the one that should read a contact sheet (human decision
 * 2026-09-04). Every stage reconciles against the same candidate set, so a
 * key added today appears in all four without visiting Settings.
 */
export async function resolveChain(
  userId: string,
  stage: ChatStage,
): Promise<ChainEntry[]> {
  const available = await candidates(userId)
  if (available.length < 2) return available

  const remaining = new Map(available.map((entry) => [entry.id, entry]))
  const chosen: ChainEntry[] = []
  for (const id of await getCredentialChain(userId, stage)) {
    const entry = remaining.get(id)
    if (!entry) continue
    remaining.delete(id)
    chosen.push(entry)
  }
  return [...chosen, ...available.filter((entry) => remaining.has(entry.id))]
}

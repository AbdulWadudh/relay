import { chmod, rm } from "node:fs/promises"

import { MediaIngestError } from "@/lib/media/errors"
import type { ParsedSource } from "@/lib/media/sources"
import { logger } from "@/lib/observability/logger"
import { updateCredentialSecret } from "@/lib/vault"
import { getSecretByType, recordSessionOutcome } from "@/lib/vault-secrets"

/**
 * Hands a downloader the user's signed-in cookie jar, then destroys it
 * (SESSION_AUTH.md §4.2).
 *
 * A jar is a bearer token for the user's whole social account — strictly
 * more dangerous than an API key, which is scoped and individually
 * revocable. So it exists on disk for exactly as long as one download, in
 * the run's own temp directory, and never anywhere else.
 *
 * NO CREDENTIAL, NO CHANGE. When the user has not connected that source,
 * this yields null and the caller omits `--cookies` entirely, behaving
 * byte-for-byte as it did before. That is what makes this phase safe to
 * ship on its own and trivial to revert.
 */

export interface SourceCookies {
  /** Absolute-ish path valid only inside the callback. */
  path: string
  /** So a rejection can be attributed to the credential that caused it. */
  credentialId: string
}

export async function withSourceCookies<T>(
  options: { source: ParsedSource; userId: string; dir: string },
  consume: (cookies: SourceCookies | null) => Promise<T>,
): Promise<T> {
  const { source, userId, dir } = options

  // The credential's `provider` IS the media source id (SESSION_AUTH.md
  // §2.4), so this needs no mapping table.
  const stored = await getSecretByType(source.source, userId, "cookie")
  if (!stored) return await consume(null)

  const path = `${dir}/cookies.txt`
  await Bun.write(path, stored.secret)
  // Best-effort: a no-op on Windows, but on the Linux deploy it keeps the
  // jar off other accounts on the box for the seconds it exists.
  await chmod(path, 0o600).catch(() => {})

  // Write-back is gated on this. yt-dlp rewrites the jar on EVERY exit,
  // including a failed one, and MEASURED 2026-09-02: after a failed fetch
  // the file it leaves behind is the anonymous cookie set the failed
  // request received — the session cookie is simply not in it. Persisting
  // that in a `finally` (as this did) overwrites the stored jar with the
  // product of a request that did not work. The last jar that succeeded is
  // strictly the better thing to keep, so a failure now writes nothing.
  let succeeded = false

  try {
    const result = await consume({ path, credentialId: stored.credentialId })
    succeeded = true
    // A completed download is the only proof a jar is alive, so it is also
    // the only thing that clears the reject counter (SESSION_AUTH.md §4.3).
    await recordSessionOutcome(stored.credentialId, userId, "accepted")
    return result
  } catch (error) {
    // Attributed to the credential, not the run: this is the ONE failure
    // that means "your session died", and the row has to know because the
    // Vault is where the user fixes it. Every other failure — a private
    // video, a 403, a dead binary — says nothing about the jar and must
    // not count against it.
    if (error instanceof MediaIngestError && error.code === "SESSION_EXPIRED") {
      await recordSessionOutcome(stored.credentialId, userId, "rejected")
    }
    throw error
  } finally {
    if (succeeded) {
      await persistRotation(path, stored.secret, stored.credentialId, userId)
    }
    // Deleted here AND covered by the run directory's own purge in
    // ingest.ts — a hard kill between the two still leaves nothing behind.
    await rm(path, { force: true }).catch(() => {})
  }
}

/**
 * `--cookies` is READ-WRITE: yt-dlp writes the refreshed jar back on exit.
 * Persisting that is how a session survives weeks instead of dying at its
 * original cookie lifetime — the provider rotates values as it goes.
 *
 * Never logs the jar, only whether it moved.
 */
async function persistRotation(
  path: string,
  original: string,
  credentialId: string,
  userId: string,
): Promise<void> {
  try {
    const current = await Bun.file(path).text()
    if (!current || current === original) return
    await updateCredentialSecret(credentialId, userId, current)
    logger.info("Session cookies rotated", { credential_id: credentialId })
  } catch (error) {
    // A failed write-back costs freshness, not correctness: the stored jar
    // is still the one that just worked. Never fail a run for it.
    logger.warn("Could not persist rotated session cookies", {
      credential_id: credentialId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

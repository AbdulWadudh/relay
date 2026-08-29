/**
 * AES-256-GCM credential encryption (TRD §4) — Bun-native WebCrypto.
 *
 * Zero `node:*` imports (RULES.md): uses `crypto.subtle` for AES-GCM,
 * `crypto.getRandomValues` for unique 96-bit IVs per record, and Bun's
 * native `Uint8Array` hex/base64 codecs.
 *
 * Storage format (unchanged): WebCrypto appends the 16-byte GCM auth tag
 * to the ciphertext, so the encrypted column holds
 * base64(ciphertext || authTag) and the `iv` column holds the hex IV.
 * Decrypting a tampered payload throws, so integrity is always verified.
 */

import config from "@/config"

const IV_LENGTH = 12

let cachedKey: CryptoKey | null = null

async function getMasterKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  const hex = config.vault.keyHex
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'VAULT_KEY must be a 64-character hex string (32 bytes). Generate one with: bun -e "console.log(crypto.getRandomValues(new Uint8Array(32)).toHex())"',
    )
  }
  cachedKey = await crypto.subtle.importKey(
    "raw",
    Uint8Array.fromHex(hex),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  )
  return cachedKey
}

export interface EncryptedPayload {
  /** base64(ciphertext || authTag) — store in `access_token` / `refresh_token`. */
  ciphertext: string
  /** hex-encoded unique IV — store in the `iv` column. */
  iv: string
}

export async function encrypt(plaintext: string): Promise<EncryptedPayload> {
  const key = await getMasterKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return { ciphertext: new Uint8Array(encrypted).toBase64(), iv: iv.toHex() }
}

/** Throws on tampered or corrupted payloads (GCM auth tag mismatch). */
export async function decrypt(
  ciphertext: string,
  ivHex: string,
): Promise<string> {
  const key = await getMasterKey()
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: Uint8Array.fromHex(ivHex) },
    key,
    Uint8Array.fromBase64(ciphertext),
  )
  return new TextDecoder().decode(decrypted)
}

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

/**
 * AES-256-GCM credential encryption (TRD §4).
 *
 * - Cipher: AES-256-GCM, unique 96-bit IV per record.
 * - Key: 32-byte hex string in MASTER_ENCRYPTION_KEY (.env.local).
 * - Storage format: base64(ciphertext || authTag) in the encrypted column,
 *   hex IV in the `iv` column. The 16-byte GCM auth tag is appended to the
 *   ciphertext so tampering is detected on decrypt without a schema change.
 */

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getMasterKey(): Buffer {
  const hex = process.env.MASTER_ENCRYPTION_KEY
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "MASTER_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate one with: bun -e \"console.log(require('node:crypto').randomBytes(32).toString('hex'))\"",
    )
  }
  return Buffer.from(hex, "hex")
}

export interface EncryptedPayload {
  /** base64(ciphertext || authTag) — store in `access_token` / `refresh_token`. */
  ciphertext: string
  /** hex-encoded unique IV — store in the `iv` column. */
  iv: string
}

export function encrypt(plaintext: string): EncryptedPayload {
  const key = getMasterKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const withTag = Buffer.concat([encrypted, cipher.getAuthTag()])
  return { ciphertext: withTag.toString("base64"), iv: iv.toString("hex") }
}

export function decrypt(ciphertext: string, ivHex: string): string {
  const key = getMasterKey()
  const raw = Buffer.from(ciphertext, "base64")
  if (raw.length < AUTH_TAG_LENGTH) {
    throw new Error("Ciphertext payload is too short to contain an auth tag")
  }
  const authTag = raw.subarray(raw.length - AUTH_TAG_LENGTH)
  const encrypted = raw.subarray(0, raw.length - AUTH_TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"))
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  )
}

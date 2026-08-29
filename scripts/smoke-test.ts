// One-off Task 1 verification: schema creation + AES-256-GCM roundtrip.
// Run: bun scripts/smoke-test.ts
import { randomBytes } from "node:crypto"

process.env.MASTER_ENCRYPTION_KEY ??= randomBytes(32).toString("hex")
process.env.RELAY_DB_PATH = "./data/smoke-test.db"

const { getDb } = await import("../src/lib/db/index.ts")
const { encrypt, decrypt } = await import("../src/lib/crypto.ts")

const db = getDb()
const tables = db
  .query<{ name: string }, []>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )
  .all()
  .map((t) => t.name)
const indexes = db
  .query<{ name: string }, []>(
    "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%' ORDER BY name",
  )
  .all()
  .map((t) => t.name)

console.log("tables:", tables.join(", "))
console.log("indexes:", indexes.join(", "))

const secret = "sk-super-secret-token-123"
const enc = encrypt(secret)
console.log("crypto roundtrip:", decrypt(enc.ciphertext, enc.iv) === secret ? "OK" : "FAIL")
console.log("iv uniqueness:", encrypt("x").iv !== encrypt("x").iv ? "OK" : "FAIL")

// Tamper detection: flip a ciphertext byte, expect auth failure.
const raw = Buffer.from(enc.ciphertext, "base64")
raw[0] ^= 0xff
try {
  decrypt(raw.toString("base64"), enc.iv)
  console.log("tamper detection: FAIL (decrypted tampered payload)")
} catch {
  console.log("tamper detection: OK")
}

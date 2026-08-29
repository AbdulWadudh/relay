// One-off Task 1 verification: schema creation + AES-256-GCM roundtrip.
// Run: bun scripts/smoke-test.ts
export {}

process.env.MASTER_ENCRYPTION_KEY ??= crypto
  .getRandomValues(new Uint8Array(32))
  .toHex()
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
const enc = await encrypt(secret)
console.log(
  "crypto roundtrip:",
  (await decrypt(enc.ciphertext, enc.iv)) === secret ? "OK" : "FAIL",
)
console.log(
  "iv uniqueness:",
  (await encrypt("x")).iv !== (await encrypt("x")).iv ? "OK" : "FAIL",
)

// Tamper detection: flip a ciphertext byte, expect GCM auth failure.
const raw = Uint8Array.fromBase64(enc.ciphertext)
raw[0] ^= 0xff
try {
  await decrypt(raw.toBase64(), enc.iv)
  console.log("tamper detection: FAIL (decrypted tampered payload)")
} catch {
  console.log("tamper detection: OK")
}

// One-off Task 1 verification: Drizzle schema migration + AES-256-GCM roundtrip.
// Run: bun scripts/smoke-test.ts
import { sql } from "drizzle-orm"
import { migrate } from "drizzle-orm/libsql/migrator"

process.env.VAULT_KEY ??= crypto
  .getRandomValues(new Uint8Array(32))
  .toHex()
process.env.DATABASE_URL = "file:./data/smoke-test.db"

const { getDb } = await import("../src/lib/db/index.ts")
const { encrypt, decrypt } = await import("../src/lib/crypto.ts")

const db = getDb()
// Migrations aren't applied automatically on connection (see RULES.md); this
// script exercises the same drizzle-kit-generated migrations the Dockerfile
// applies via `bun run db:migrate`.
await migrate(db, { migrationsFolder: "./drizzle" })

const tables = (
  await db.all<{ name: string }>(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name`,
  )
).map((t) => t.name)
const indexes = (
  await db.all<{ name: string }>(
    sql`SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%' ORDER BY name`,
  )
).map((t) => t.name)

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

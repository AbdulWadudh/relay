import { Hono } from "hono"

import { logger } from "@/lib/observability/logger"
import { credentialInputSchema } from "@/lib/schemas"
import {
  createCredential,
  deleteCredential,
  listCredentials,
} from "@/lib/vault"

/**
 * /api/v1/credentials — BYOK vault routes (TRD §3).
 * Responses are always masked: no token material ever leaves the vault.
 */

export const credentialsApp = new Hono()

credentialsApp.get("/", (c) => {
  return c.json({ credentials: listCredentials() })
})

credentialsApp.post("/", async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = credentialInputSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: "Invalid credential payload", issues: parsed.error.issues },
      400,
    )
  }
  const credential = await createCredential(parsed.data)
  logger.info("Credential stored", {
    provider: credential.provider,
    type: credential.type,
  })
  return c.json({ credential }, 201)
})

credentialsApp.delete("/:id", (c) => {
  const id = c.req.param("id")
  if (!deleteCredential(id)) {
    return c.json({ error: "Credential not found" }, 404)
  }
  logger.info("Credential deleted", { credentialId: id })
  return c.json({ ok: true })
})

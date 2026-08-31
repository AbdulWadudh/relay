import { Hono } from "hono"
import { getRequestSession } from "@/lib/auth-request"
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

export const credentialsModule = new Hono()

credentialsModule.get("/", async (c) => {
  const session = await getRequestSession(c.req.raw.headers)
  if (!session) return c.json({ error: "Unauthorized" }, 401)
  return c.json({ credentials: await listCredentials(session.user.id) })
})

credentialsModule.post("/", async (c) => {
  const session = await getRequestSession(c.req.raw.headers)
  if (!session) return c.json({ error: "Unauthorized" }, 401)
  const body = await c.req.json().catch(() => null)
  const parsed = credentialInputSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: "Invalid credential payload", issues: parsed.error.issues },
      400,
    )
  }
  const credential = await createCredential(parsed.data, session.user.id)
  logger.info("Credential stored", {
    provider: credential.provider,
    type: credential.type,
  })
  return c.json({ credential }, 201)
})

credentialsModule.delete("/:id", async (c) => {
  const session = await getRequestSession(c.req.raw.headers)
  const id = c.req.param("id")
  if (!session) return c.json({ error: "Unauthorized" }, 401)
  if (!(await deleteCredential(id, session.user.id))) {
    return c.json({ error: "Credential not found" }, 404)
  }
  logger.info("Credential deleted", { credentialId: id })
  return c.json({ ok: true })
})

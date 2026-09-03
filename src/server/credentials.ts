import { Hono } from "hono"
import { logger } from "@/lib/observability/logger"
import {
  credentialActiveSchema,
  credentialInputSchema,
  credentialUpdateSchema,
} from "@/lib/schemas"
import {
  createCredential,
  deleteCredential,
  listCredentials,
  setCredentialActive,
  updateCredentialMeta,
  updateCredentialSecret,
} from "@/lib/vault"
import { requireSession, type SessionEnv } from "@/server/require-session"

/**
 * /api/v1/credentials — BYOK vault routes (TRD §3).
 * Responses are always masked: no token material ever leaves the vault.
 */

export const credentialsModule = new Hono<SessionEnv>()
credentialsModule.use("*", requireSession)

credentialsModule.get("/", async (c) => {
  const session = c.get("session")
  return c.json({ credentials: await listCredentials(session.user.id) })
})

credentialsModule.post("/", async (c) => {
  const session = c.get("session")
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
  const session = c.get("session")
  const id = c.req.param("id")
  if (!(await deleteCredential(id, session.user.id))) {
    return c.json({ error: "Credential not found" }, 404)
  }
  logger.info("Credential deleted", { credentialId: id })
  return c.json({ ok: true })
})

/** Rename and/or rotate the secret. Responses stay masked. */
credentialsModule.patch("/:id", async (c) => {
  const session = c.get("session")
  const id = c.req.param("id")
  const body = await c.req.json().catch(() => null)
  const parsed = credentialUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { error: "Invalid credential payload", issues: parsed.error.issues },
      400,
    )
  }

  const { label, account, accessToken } = parsed.data

  let credential = null
  if (label !== undefined || account !== undefined) {
    credential = await updateCredentialMeta(id, session.user.id, {
      label,
      accountName: account,
    })
  }
  if (accessToken !== undefined) {
    credential = await updateCredentialSecret(id, session.user.id, accessToken)
  }
  if (!credential) return c.json({ error: "Credential not found" }, 404)

  // Never log which field changed to what — only that it changed.
  logger.info("Credential updated", {
    credential_id: id,
    renamed: label !== undefined,
    account_set: account !== undefined,
    secret_rotated: accessToken !== undefined,
  })
  return c.json({ credential })
})

/** Switches a credential in or out of the fallback chain. */
credentialsModule.put("/:id/active", async (c) => {
  const session = c.get("session")
  const id = c.req.param("id")
  const parsed = credentialActiveSchema.safeParse(
    await c.req.json().catch(() => null),
  )
  if (!parsed.success) {
    return c.json({ error: "Invalid value", issues: parsed.error.issues }, 400)
  }

  const provider = await setCredentialActive(
    id,
    session.user.id,
    parsed.data.active,
  )
  if (!provider) return c.json({ error: "Credential not found" }, 404)
  logger.info("Credential active state changed", {
    credential_id: id,
    provider,
    active: parsed.data.active,
  })
  return c.json({ credentials: await listCredentials(session.user.id) })
})

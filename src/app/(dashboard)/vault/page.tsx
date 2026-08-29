import { Suspense } from "react"

import { ShellContent, ShellHeader } from "@/components/app-shell"
import { CredentialsTable } from "@/components/vault/credentials-table"
import { VaultActions, VaultNotices } from "@/components/vault/vault-actions"
import { requireSession } from "@/lib/auth-session"
import { listCredentials } from "@/lib/vault"
import { configuredRayIds } from "@/server/ray-providers"

export const dynamic = "force-dynamic"

export const metadata = { title: "Vault" }

export default async function VaultPage() {
  const session = await requireSession()
  const credentials = listCredentials(session.user.id)
  const configuredIds = configuredRayIds()

  return (
    <>
      <ShellHeader title="Vault">
        <VaultActions configuredIds={configuredIds} />
      </ShellHeader>
      <ShellContent>
        <Suspense>
          <VaultNotices />
        </Suspense>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <p className="max-w-[70ch] text-base text-muted-foreground">
            Provider keys and Ray tokens are encrypted at rest with
            AES-256-GCM. Relay never displays or logs stored secrets.
          </p>
          <CredentialsTable
            credentials={credentials}
            configuredIds={configuredIds}
          />
        </div>
      </ShellContent>
    </>
  )
}

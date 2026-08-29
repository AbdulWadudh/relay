import { Suspense } from "react"

import { ShellContent, ShellHeader } from "@/components/app-shell"
import { CredentialsTable } from "@/components/vault/credentials-table"
import { VaultActions, VaultNotices } from "@/components/vault/vault-actions"
import config from "@/config"
import { listCredentials } from "@/lib/vault"

export const dynamic = "force-dynamic"

export const metadata = { title: "Vault" }

export default function VaultPage() {
  const credentials = listCredentials()
  const notionConnected = credentials.some((c) => c.provider === "notion")
  const notionReady = Boolean(
    config.notion.clientId && config.notion.clientSecret,
  )

  return (
    <>
      <ShellHeader title="Vault">
        <VaultActions
          notionConnected={notionConnected}
          notionReady={notionReady}
        />
      </ShellHeader>
      <ShellContent>
        <Suspense>
          <VaultNotices />
        </Suspense>
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <p className="max-w-[65ch] text-muted-foreground text-sm">
            Provider keys and OAuth tokens are encrypted at rest with
            AES-256-GCM. Relay never displays or logs stored secrets.
          </p>
          <CredentialsTable credentials={credentials} />
        </div>
      </ShellContent>
    </>
  )
}

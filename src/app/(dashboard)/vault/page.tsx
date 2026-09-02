import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { Suspense } from "react"

import { ShellContent, ShellHeader } from "@/components/app-shell"
import { CredentialsTable } from "@/components/vault/credentials-table"
import { CredentialsTableSkeleton } from "@/components/vault/credentials-table-skeleton"
import { VaultActions, VaultNotices } from "@/components/vault/vault-actions"
import { requireSession } from "@/lib/auth-session"
import { getQueryClient } from "@/lib/query/client"
import { credentialKeys } from "@/lib/query/keys"
import { listCredentials } from "@/lib/vault"
import { configuredRayIds } from "@/server/ray-providers"

export const dynamic = "force-dynamic"

export const metadata = { title: "Vault" }

/**
 * Prefetches the masked credential list into the cache the browser
 * hydrates, under the same `credentialKeys.list()` that `useCredentials()`
 * reads. Isolated in its own component so the Suspense boundary streams
 * only the table rows.
 */
async function VaultData({
  userId,
  configuredIds,
}: {
  userId: string
  configuredIds: string[]
}) {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: credentialKeys.list(),
    queryFn: () => listCredentials(userId),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CredentialsTable configuredIds={configuredIds} />
    </HydrationBoundary>
  )
}

export default async function VaultPage() {
  const session = await requireSession()
  const configuredIds = configuredRayIds()

  return (
    <>
      <ShellHeader title="Vault">
        <VaultActions configuredIds={configuredIds} />
      </ShellHeader>
      <ShellContent fill>
        <Suspense>
          <VaultNotices />
        </Suspense>
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6">
          <Suspense fallback={<CredentialsTableSkeleton />}>
            <VaultData userId={session.user.id} configuredIds={configuredIds} />
          </Suspense>
        </div>
      </ShellContent>
    </>
  )
}

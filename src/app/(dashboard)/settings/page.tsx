import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { eq } from "drizzle-orm"

import { ShellContent, ShellHeader } from "@/components/app-shell"
import { ProfileCard } from "@/components/settings/profile-card"
import { ProviderOrderCard } from "@/components/settings/provider-order-card"
import { SecurityCard } from "@/components/settings/security-card"
import { ShareCard } from "@/components/settings/share-card"
import { requireSession } from "@/lib/auth-session"
import { getDb } from "@/lib/db"
import { authAccounts } from "@/lib/db/schema"
import { getQueryClient } from "@/lib/query/client"
import { settingKeys } from "@/lib/query/keys"
import { getExtractionOrder, getShareAutoRun } from "@/lib/settings"

export const dynamic = "force-dynamic"

export const metadata = { title: "Settings" }

export default async function SettingsPage() {
  const session = await requireSession()
  const accounts = await getDb()
    .select({ providerId: authAccounts.providerId })
    .from(authAccounts)
    .where(eq(authAccounts.userId, session.user.id))
    .all()
  const hasPassword = accounts.some((a) => a.providerId === "credential")

  // Prefetched into the same key the client hydrates, so the provider list
  // renders at its real length on first paint. Without this the skeleton
  // would have to guess a row count and the layout would jump when the
  // actual (filtered) list arrived — RULES.md forbids that.
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: settingKeys.extractionOrder(),
    queryFn: () => getExtractionOrder(session.user.id),
  })
  await queryClient.prefetchQuery({
    queryKey: settingKeys.shareAutoRun(),
    queryFn: () => getShareAutoRun(session.user.id),
  })

  return (
    <>
      <ShellHeader title="Settings" />
      <ShellContent>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <ProfileCard
            user={{
              name: session.user.name,
              email: session.user.email,
              avatar: session.user.image ?? undefined,
            }}
          />
          <HydrationBoundary state={dehydrate(queryClient)}>
            <ProviderOrderCard />
            <ShareCard />
          </HydrationBoundary>
          <SecurityCard hasPassword={hasPassword} />
        </div>
      </ShellContent>
    </>
  )
}

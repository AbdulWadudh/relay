import { eq } from "drizzle-orm"

import { ShellContent, ShellHeader } from "@/components/app-shell"
import { ProfileCard } from "@/components/settings/profile-card"
import { SecurityCard } from "@/components/settings/security-card"
import { requireSession } from "@/lib/auth-session"
import { getDb } from "@/lib/db"
import { authAccounts } from "@/lib/db/schema"

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
          <SecurityCard hasPassword={hasPassword} />
        </div>
      </ShellContent>
    </>
  )
}

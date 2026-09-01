import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { Suspense } from "react"

import { ShellContent, ShellHeader } from "@/components/app-shell"
import { PromptsList } from "@/components/prompts/prompts-list"
import { PromptsSkeleton } from "@/components/prompts/prompts-skeleton"
import { requireSession } from "@/lib/auth-session"
import { listPrompts, seedPrompts } from "@/lib/extraction/prompts"
import { getQueryClient } from "@/lib/query/client"
import { promptKeys } from "@/lib/query/keys"

export const dynamic = "force-dynamic"

export const metadata = { title: "Prompts" }

/**
 * Same prefetch pattern as /agents: read the database directly, write
 * under the key the browser hydrates from, so the first paint has data.
 * Seeding here means the page is populated even for a user who has never
 * run the pipeline.
 */
async function PromptsData({ userId }: { userId: string }) {
  const queryClient = getQueryClient()
  await seedPrompts(userId)
  await queryClient.prefetchQuery({
    queryKey: promptKeys.list(),
    queryFn: () => listPrompts(userId),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PromptsList />
    </HydrationBoundary>
  )
}

export default async function PromptsPage() {
  const session = await requireSession()

  return (
    <>
      <ShellHeader title="Prompts" />
      <ShellContent>
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
            The instructions Relay sends on every run, before your agent's own
            prompt. Editing one changes the next run — no deploy, no restart.
          </p>
          <Suspense fallback={<PromptsSkeleton />}>
            <PromptsData userId={session.user.id} />
          </Suspense>
        </div>
      </ShellContent>
    </>
  )
}

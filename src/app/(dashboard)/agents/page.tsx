import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { Suspense } from "react"

import { AgentFormDialog } from "@/components/agents/agent-form-dialog"
import { AgentsTable } from "@/components/agents/agents-table"
import { AgentsTableSkeleton } from "@/components/agents/agents-table-skeleton"
import { ShellContent, ShellHeader } from "@/components/app-shell"
import { listAgents } from "@/lib/agents"
import { requireSession } from "@/lib/auth-session"
import { getQueryClient } from "@/lib/query/client"
import { agentKeys } from "@/lib/query/keys"

export const dynamic = "force-dynamic"

export const metadata = { title: "Agents" }

/**
 * Seeds the cache the client hydrates into. The prefetch reads the
 * database directly rather than calling our own HTTP route, but writes
 * under the same `agentKeys.list()` the browser's `useAgents()` reads —
 * so the first paint has data and no client refetch is needed.
 *
 * Only this component awaits, so the Suspense boundary around it streams
 * just the table rows; the page shell renders immediately.
 */
async function AgentsData({ userId }: { userId: string }) {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: agentKeys.list(),
    queryFn: () => listAgents(userId),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AgentsTable />
    </HydrationBoundary>
  )
}

export default async function AgentsPage() {
  const session = await requireSession()

  return (
    <>
      <ShellHeader title="Agents">
        <AgentFormDialog />
      </ShellHeader>
      <ShellContent fill>
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6">
          <Suspense fallback={<AgentsTableSkeleton />}>
            <AgentsData userId={session.user.id} />
          </Suspense>
        </div>
      </ShellContent>
    </>
  )
}

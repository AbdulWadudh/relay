import { Suspense } from "react"

import { AgentFormDialog } from "@/components/agents/agent-form-dialog"
import { AgentsTable } from "@/components/agents/agents-table"
import { AgentsTableSkeleton } from "@/components/agents/agents-table-skeleton"
import { ShellContent, ShellHeader } from "@/components/app-shell"
import { listAgents } from "@/lib/agents"
import { requireSession } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export const metadata = { title: "Agents" }

/**
 * Only this piece awaits the agents query, so the Suspense boundary around
 * it streams just the table rows. A route-level loading.tsx would instead
 * replace the whole page (header and Create Agent button included) while
 * the data loads.
 */
async function AgentsList({ userId }: { userId: string }) {
  const agents = await listAgents(userId)
  return <AgentsTable agents={agents} />
}

export default async function AgentsPage() {
  const session = await requireSession()

  return (
    <>
      <ShellHeader title="Agents">
        <AgentFormDialog />
      </ShellHeader>
      <ShellContent>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <Suspense fallback={<AgentsTableSkeleton />}>
            <AgentsList userId={session.user.id} />
          </Suspense>
        </div>
      </ShellContent>
    </>
  )
}

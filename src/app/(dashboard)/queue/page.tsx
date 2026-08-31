import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { Suspense } from "react"

import { ShellContent, ShellHeader } from "@/components/app-shell"
import { NewRunDialog } from "@/components/queue/new-run-dialog"
import { RunsTable } from "@/components/queue/runs-table"
import { RunsTableSkeleton } from "@/components/queue/runs-table-skeleton"
import { requireSession } from "@/lib/auth-session"
import { getQueryClient } from "@/lib/query/client"
import { runKeys } from "@/lib/query/keys"
import { listRuns } from "@/lib/runs"

export const dynamic = "force-dynamic"

export const metadata = { title: "Queue" }

/**
 * Seeds the cache the client hydrates into, reading the database directly
 * rather than calling our own HTTP route but writing under the same
 * `runKeys.list()` the browser's `useRuns()` reads — so the first paint
 * has data and no client refetch is needed.
 *
 * Only this component awaits, so the Suspense boundary streams just the
 * rows; the page shell renders immediately.
 */
async function RunsData({ userId }: { userId: string }) {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: runKeys.list(),
    queryFn: () => listRuns(userId),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RunsTable />
    </HydrationBoundary>
  )
}

export default async function QueuePage() {
  const session = await requireSession()

  return (
    <>
      <ShellHeader title="Queue">
        <NewRunDialog />
      </ShellHeader>
      <ShellContent>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <Suspense fallback={<RunsTableSkeleton />}>
            <RunsData userId={session.user.id} />
          </Suspense>
        </div>
      </ShellContent>
    </>
  )
}

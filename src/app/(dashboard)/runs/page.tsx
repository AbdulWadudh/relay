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

export const metadata = { title: "Runs" }

/**
 * Seeds the cache the client hydrates into, reading the database directly
 * rather than calling our own HTTP route but writing under the same
 * `runKeys.list()` the browser's `useRuns()` reads — so the first paint
 * has data and no client refetch is needed.
 *
 * Only this component awaits, so the Suspense boundary streams just the
 * rows; the page shell renders immediately.
 */
async function RunsData({ userId, page }: { userId: string; page: number }) {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: runKeys.list(page),
    queryFn: () => listRuns(userId, page),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RunsTable page={page} />
    </HydrationBoundary>
  )
}

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await requireSession()
  // Parsed here and passed down, not read again in the client: the server
  // prefetch and the browser's query key must agree on the page or the
  // first paint hydrates one page's data under another page's key.
  // `listRuns` clamps, so anything unparseable safely lands on page 1.
  const parsed = Number.parseInt((await searchParams).page ?? "1", 10)
  const page = Number.isNaN(parsed) || parsed < 1 ? 1 : parsed

  return (
    <>
      <ShellHeader title="Runs">
        <NewRunDialog />
      </ShellHeader>
      <ShellContent fill>
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6">
          <Suspense key={page} fallback={<RunsTableSkeleton />}>
            <RunsData userId={session.user.id} page={page} />
          </Suspense>
        </div>
      </ShellContent>
    </>
  )
}

import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { ShellContent, ShellHeader } from "@/components/app-shell"
import { RunDetail } from "@/components/queue/run-detail"
import { RunDetailSkeleton } from "@/components/queue/run-detail-skeleton"
import { requireSession } from "@/lib/auth-session"
import { getQueryClient } from "@/lib/query/client"
import { runKeys } from "@/lib/query/keys"
import { getRun } from "@/lib/runs"

export const dynamic = "force-dynamic"

export const metadata = { title: "Run" }

type Params = Promise<{ id: string }>

/**
 * Prefetches into the same `runKeys.detail(id)` the browser's `useRun()`
 * reads, so the first paint has data and polling takes over from there.
 * 404s server-side when the run doesn't belong to this user, rather than
 * rendering a shell that then fails client-side.
 */
async function RunData({ id, userId }: { id: string; userId: string }) {
  const run = await getRun(id, userId)
  if (!run) notFound()

  const queryClient = getQueryClient()
  queryClient.setQueryData(runKeys.detail(id), run)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RunDetail runId={id} />
    </HydrationBoundary>
  )
}

export default async function RunPage({ params }: { params: Params }) {
  const [{ id }, session] = await Promise.all([params, requireSession()])

  return (
    <>
      {/* Back navigation lives inline beside the run status. */}
      <ShellHeader title="Run" />
      <ShellContent>
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <Suspense fallback={<RunDetailSkeleton />}>
            <RunData id={id} userId={session.user.id} />
          </Suspense>
        </div>
      </ShellContent>
    </>
  )
}

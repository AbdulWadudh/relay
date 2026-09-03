import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { Dashboard } from "@/components/analytics/dashboard"
import { getAnalytics } from "@/lib/analytics"
import { DEFAULT_RANGE } from "@/lib/analytics/window"
import { requireSession } from "@/lib/auth-session"
import { getQueryClient } from "@/lib/query/client"
import { analyticsKeys } from "@/lib/query/keys"

export const dynamic = "force-dynamic"

export const metadata = { title: "Dashboard" }

/**
 * Seeds the cache the client hydrates into, reading the database directly
 * rather than calling our own HTTP route but writing under the same
 * `analyticsKeys.summary()` the browser's `useAnalytics()` reads — so the
 * first paint has data and no client refetch is needed.
 *
 * Only the DEFAULT range is prefetched. Every other preset is a click
 * away and fetches on demand; prefetching all four would run the same
 * scan four times to serve one.
 */
export default async function DashboardPage() {
  const session = await requireSession()

  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: analyticsKeys.summary(DEFAULT_RANGE),
    queryFn: () => getAnalytics(session.user.id, DEFAULT_RANGE),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Dashboard />
    </HydrationBoundary>
  )
}

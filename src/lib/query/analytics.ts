"use client"

import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query"

import type { AnalyticsSummary } from "@/lib/analytics"
import type { AnalyticsRange } from "@/lib/analytics/window"
import { apiFetch } from "@/lib/query/http"
import { analyticsKeys } from "@/lib/query/keys"

/**
 * Dashboard server-state.
 *
 * `keepPreviousData` is the important line: changing the range holds the
 * previous render while the new window loads, so the charts dim rather
 * than collapsing into skeletons and back. A dashboard that reflows on
 * every filter change is unreadable, and the layout is not allowed to
 * dance (RULES.md).
 *
 * No polling. Unlike the runs list, nothing here changes second to
 * second, and a background refetch that redraws nine charts is worse than
 * a stale number.
 */

const STALE_MS = 60_000

export function analyticsQueryOptions(range: AnalyticsRange) {
  return queryOptions({
    queryKey: analyticsKeys.summary(range),
    queryFn: () =>
      apiFetch<AnalyticsSummary>(
        `/analytics/summary?range=${encodeURIComponent(range)}`,
      ),
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  })
}

export function useAnalytics(range: AnalyticsRange) {
  return useQuery(analyticsQueryOptions(range))
}

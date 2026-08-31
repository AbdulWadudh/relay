import { isServer, QueryClient } from "@tanstack/react-query"

import { ApiError } from "@/lib/query/http"

/**
 * QueryClient factory + per-environment accessor.
 *
 * The server builds a fresh client per request (never share cache between
 * users); the browser keeps one singleton so every component reads the
 * same cache instead of duplicating server data into client state.
 */

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Server-rendered data arrives already fresh — without a stale
        // window every hydrated query would immediately refetch on mount.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          // 401/404/400 are terminal; only retry infrastructure failures.
          if (error instanceof ApiError && error.isClientError) return false
          return failureCount < 2
        },
      },
      mutations: {
        // Mutations are not idempotent — a retry could double-write.
        retry: false,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient()
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

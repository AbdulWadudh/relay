"use client"

import { QueryClientProvider } from "@tanstack/react-query"

import { getQueryClient } from "@/lib/query/client"

/**
 * Mounts the shared QueryClient. `getQueryClient()` returns a per-request
 * instance on the server and a browser singleton on the client, so this
 * stays safe to render inside the streamed RSC tree.
 */
export function QueryProvider({ children }: React.PropsWithChildren) {
  const queryClient = getQueryClient()
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

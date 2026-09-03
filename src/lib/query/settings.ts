"use client"

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { apiFetch } from "@/lib/query/http"
import { settingKeys } from "@/lib/query/keys"

/**
 * Per-user settings server-state.
 *
 * The extraction-order mutation is OPTIMISTIC: a drag that waits for a
 * round-trip before the row moves feels broken, and the list snapping back
 * mid-drag is worse than a brief inconsistency. The rollback in `onError`
 * is what makes that safe, and `onSettled` reconciles against the server's
 * reconciled order (which can differ from what we sent — see
 * `resolveExtractionOrder`).
 */

async function fetchExtractionOrder(): Promise<string[]> {
  const { order } = await apiFetch<{ order: string[] }>(
    "/settings/extraction-order",
  )
  return order
}

export function extractionOrderQueryOptions() {
  return queryOptions({
    queryKey: settingKeys.extractionOrder(),
    queryFn: fetchExtractionOrder,
  })
}

export function useExtractionOrder() {
  return useQuery(extractionOrderQueryOptions())
}

export function useSaveExtractionOrder() {
  const queryClient = useQueryClient()
  const key = settingKeys.extractionOrder()

  return useMutation({
    mutationFn: async (order: string[]) => {
      const result = await apiFetch<{ order: string[] }>(
        "/settings/extraction-order",
        { method: "PUT", body: JSON.stringify({ order }) },
      )
      return result.order
    },
    onMutate: async (order) => {
      // Stop an in-flight refetch from landing on top of the optimistic
      // value and visibly reverting the row the user just dropped.
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<string[]>(key)
      queryClient.setQueryData(key, order)
      return { previous }
    },
    onError: (_error, _order, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

async function fetchShareAutoRun(): Promise<boolean> {
  const { enabled } = await apiFetch<{ enabled: boolean }>(
    "/settings/share-auto-run",
  )
  return enabled
}

export function shareAutoRunQueryOptions() {
  return queryOptions({
    queryKey: settingKeys.shareAutoRun(),
    queryFn: fetchShareAutoRun,
  })
}

export function useShareAutoRun() {
  return useQuery(shareAutoRunQueryOptions())
}

// Optimistic, like the order above: a toggle that waits for a round trip
// before it moves reads as broken.
export function useSaveShareAutoRun() {
  const queryClient = useQueryClient()
  const key = settingKeys.shareAutoRun()

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const result = await apiFetch<{ enabled: boolean }>(
        "/settings/share-auto-run",
        { method: "PUT", body: JSON.stringify({ enabled }) },
      )
      return result.enabled
    },
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<boolean>(key)
      queryClient.setQueryData(key, enabled)
      return { previous }
    },
    onError: (_error, _enabled, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(key, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

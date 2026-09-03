"use client"

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import type { ChainEntry } from "@/lib/extraction/chain"
import { apiFetch } from "@/lib/query/http"
import { settingKeys } from "@/lib/query/keys"

/**
 * Per-user settings server-state.
 *
 * The extraction-chain mutation is OPTIMISTIC: a drag that waits for a
 * round-trip before the row moves feels broken, and the list snapping back
 * mid-drag is worse than a brief inconsistency. The rollback in `onError`
 * is what makes that safe, and `onSettled` reconciles against the server's
 * answer, which can differ from what we sent — see `resolveChain`.
 */

async function fetchExtractionChain(): Promise<ChainEntry[]> {
  const { chain } = await apiFetch<{ chain: ChainEntry[] }>(
    "/settings/extraction-chain",
  )
  return chain
}

export function extractionChainQueryOptions() {
  return queryOptions({
    queryKey: settingKeys.extractionChain(),
    queryFn: fetchExtractionChain,
  })
}

export function useExtractionChain() {
  return useQuery(extractionChainQueryOptions())
}

export function useSaveExtractionChain() {
  const queryClient = useQueryClient()
  const key = settingKeys.extractionChain()

  return useMutation({
    mutationFn: async (chain: ChainEntry[]) => {
      const result = await apiFetch<{ chain: ChainEntry[] }>(
        "/settings/extraction-chain",
        {
          method: "PUT",
          body: JSON.stringify({ chain: chain.map((entry) => entry.id) }),
        },
      )
      return result.chain
    },
    onMutate: async (chain) => {
      // Stop an in-flight refetch from landing on top of the optimistic
      // value and visibly reverting the row the user just dropped.
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<ChainEntry[]>(key)
      queryClient.setQueryData(key, chain)
      return { previous }
    },
    onError: (_error, _chain, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSuccess: (chain) => {
      queryClient.setQueryData(key, chain)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
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

"use client"

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import type { ChainEntry } from "@/lib/extraction/chain"
import type { AccountModels } from "@/lib/extraction/model-choice"
import type { ChatStage } from "@/lib/extraction/stages"
import { apiFetch } from "@/lib/query/http"
import { settingKeys } from "@/lib/query/keys"

/**
 * Per-user settings server-state.
 *
 * The chain mutation is OPTIMISTIC: a drag that waits for a round-trip
 * before the row moves feels broken, and the list snapping back mid-drag
 * is worse than a brief inconsistency. The rollback in `onError` is what
 * makes that safe, and `onSettled` reconciles against the server's answer,
 * which can differ from what we sent — see `resolveChain`.
 *
 * All four stages arrive in ONE query, so switching tabs never loads.
 */

export type StageChains = Partial<Record<ChatStage, ChainEntry[]>>

async function fetchChains(): Promise<StageChains> {
  const { chains } = await apiFetch<{ chains: StageChains }>("/settings/chains")
  return chains
}

export function chainsQueryOptions() {
  return queryOptions({
    queryKey: settingKeys.chains(),
    queryFn: fetchChains,
  })
}

export function useChains() {
  return useQuery(chainsQueryOptions())
}

export interface SaveChainVariables {
  stage: ChatStage
  chain: ChainEntry[]
}

export function useSaveChain() {
  const queryClient = useQueryClient()
  const key = settingKeys.chains()

  return useMutation({
    mutationFn: async ({ stage, chain }: SaveChainVariables) => {
      const result = await apiFetch<{ chain: ChainEntry[] }>(
        "/settings/chains",
        {
          method: "PUT",
          body: JSON.stringify({ stage, chain: chain.map((e) => e.id) }),
        },
      )
      return { stage, chain: result.chain }
    },
    onMutate: async ({ stage, chain }) => {
      // Stop an in-flight refetch from landing on top of the optimistic
      // value and visibly reverting the row the user just dropped.
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<StageChains>(key)
      queryClient.setQueryData<StageChains>(key, (current) => ({
        ...current,
        [stage]: chain,
      }))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSuccess: ({ stage, chain }) => {
      queryClient.setQueryData<StageChains>(key, (current) => ({
        ...current,
        [stage]: chain,
      }))
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

/**
 * Which model each account in a stage would use. Fetched per stage, only
 * for the tab that is open, because the server reads a provider catalog
 * per account to answer.
 */
export function stageModelsQueryOptions(stage: ChatStage) {
  return queryOptions({
    queryKey: settingKeys.stageModels(stage),
    queryFn: async () => {
      const { accounts } = await apiFetch<{ accounts: AccountModels[] }>(
        `/settings/models/${stage}`,
      )
      return accounts
    },
    // A catalog snapshot lives a day server-side, so re-asking on every
    // tab switch buys nothing.
    staleTime: 5 * 60 * 1000,
  })
}

export function useStageModels(stage: ChatStage) {
  return useQuery(stageModelsQueryOptions(stage))
}

export interface PinModelVariables {
  stage: ChatStage
  entryId: string
  /** null unpins, which hands the choice back to the ranker. */
  model: string | null
}

export function usePinModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ stage, entryId, model }: PinModelVariables) => {
      const { accounts } = await apiFetch<{ accounts: AccountModels[] }>(
        "/settings/models",
        {
          method: "PUT",
          body: JSON.stringify({ stage, entryId, model }),
        },
      )
      return { stage, accounts }
    },
    onMutate: async ({ stage, entryId, model }) => {
      const key = settingKeys.stageModels(stage)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<AccountModels[]>(key)
      queryClient.setQueryData<AccountModels[]>(key, (accounts) =>
        accounts?.map((account) =>
          account.entryId === entryId
            ? {
                ...account,
                pinned: model,
                // Unpinning hands the choice back to the ranker, whose
                // answer is the head of the list this row already holds.
                using: model ?? account.models[0]?.id ?? null,
              }
            : account,
        ),
      )
      return { previous, key }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous)
      }
    },
    onSuccess: ({ stage, accounts }) => {
      queryClient.setQueryData(settingKeys.stageModels(stage), accounts)
    },
  })
}

"use client"

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { apiFetch } from "@/lib/query/http"
import { promptKeys } from "@/lib/query/keys"

/**
 * Prompts server-state (Task 4.4), following the same shape as the agents
 * and credentials domains.
 *
 * A save returns the whole refreshed list rather than one row, so the
 * cache is replaced from the server's answer instead of being patched
 * locally — the server bumps `version` and `edited`, and guessing those
 * client-side would show stale values until the next refetch.
 */

export interface PromptSummary {
  id: string
  key: string
  name: string
  description: string
  content: string
  version: number
  additionalData: { edited?: boolean }
  createdAt: number
  updatedAt: number
}

async function fetchPrompts(): Promise<PromptSummary[]> {
  const { prompts } = await apiFetch<{ prompts: PromptSummary[] }>("/prompts")
  return prompts
}

export function promptsQueryOptions() {
  return queryOptions({
    queryKey: promptKeys.list(),
    queryFn: fetchPrompts,
  })
}

export function usePrompts() {
  return useQuery(promptsQueryOptions())
}

export function useUpdatePrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { key: string; content: string }) => {
      const { prompts } = await apiFetch<{ prompts: PromptSummary[] }>(
        `/prompts/${input.key}`,
        { method: "PUT", body: JSON.stringify({ content: input.content }) },
      )
      return prompts
    },
    onSuccess: (prompts) => {
      queryClient.setQueryData<PromptSummary[]>(promptKeys.list(), prompts)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() })
    },
  })
}

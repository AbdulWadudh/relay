"use client"

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import type { AgentSummary } from "@/lib/agents"
import { apiFetch } from "@/lib/query/http"
import { agentKeys } from "@/lib/query/keys"
import type { AgentInput, AgentUpdateInput } from "@/lib/schemas"

/**
 * Agents server-state. Query functions live next to the hooks that use
 * them; the same `agentKeys` are prefetched on the server (see the agents
 * page) so the browser hydrates this cache instead of refetching.
 *
 * Server data lives only here — components read it through these hooks
 * rather than copying it into local or global client state.
 */

async function fetchAgents(): Promise<AgentSummary[]> {
  const { agents } = await apiFetch<{ agents: AgentSummary[] }>("/agents")
  return agents
}

export function agentsQueryOptions() {
  return queryOptions({
    queryKey: agentKeys.list(),
    queryFn: fetchAgents,
  })
}

export function useAgents() {
  return useQuery(agentsQueryOptions())
}

/** Replaces the cached list, keeping every reader in sync from one write. */
function writeList(
  update: (previous: AgentSummary[]) => AgentSummary[],
): (previous: AgentSummary[] | undefined) => AgentSummary[] | undefined {
  return (previous) => (previous ? update(previous) : previous)
}

export function useCreateAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AgentInput) => {
      const { agent } = await apiFetch<{ agent: AgentSummary }>("/agents", {
        method: "POST",
        body: JSON.stringify(input),
      })
      return agent
    },
    // The server assigns the id and timestamps, so there's nothing
    // trustworthy to render optimistically — seed the cache with the real
    // row the moment it comes back instead.
    onSuccess: (agent) => {
      queryClient.setQueryData<AgentSummary[]>(
        agentKeys.list(),
        writeList((previous) => [...previous, agent]),
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() })
    },
  })
}

export interface UpdateAgentVariables {
  id: string
  input: AgentUpdateInput
}

/**
 * Optimistic update — powers both the edit dialog and the row's active
 * switch, so the toggle flips instantly and rolls back if the write fails.
 */
export function useUpdateAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: UpdateAgentVariables) => {
      const { agent } = await apiFetch<{ agent: AgentSummary }>(
        `/agents/${id}`,
        { method: "PUT", body: JSON.stringify(input) },
      )
      return agent
    },
    onMutate: async ({ id, input }) => {
      // Stop in-flight refetches from overwriting the optimistic row.
      await queryClient.cancelQueries({ queryKey: agentKeys.lists() })
      const previous = queryClient.getQueryData<AgentSummary[]>(
        agentKeys.list(),
      )
      queryClient.setQueryData<AgentSummary[]>(
        agentKeys.list(),
        writeList((agents) =>
          agents.map((agent) =>
            agent.id === id ? { ...agent, ...input } : agent,
          ),
        ),
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(agentKeys.list(), context.previous)
      }
    },
    onSettled: (_agent, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(id) })
    },
  })
}

/** Optimistic delete — the row disappears immediately, restored on failure. */
export function useDeleteAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/agents/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: agentKeys.lists() })
      const previous = queryClient.getQueryData<AgentSummary[]>(
        agentKeys.list(),
      )
      queryClient.setQueryData<AgentSummary[]>(
        agentKeys.list(),
        writeList((agents) => agents.filter((agent) => agent.id !== id)),
      )
      return { previous }
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(agentKeys.list(), context.previous)
      }
    },
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() })
      queryClient.removeQueries({ queryKey: agentKeys.detail(id) })
    },
  })
}

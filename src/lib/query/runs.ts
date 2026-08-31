"use client"

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { apiFetch } from "@/lib/query/http"
import { runKeys } from "@/lib/query/keys"
import { isTerminal } from "@/lib/run-status"
import type { RunDetail, RunSummary } from "@/lib/runs"
import type { RelayProcessInput } from "@/lib/schemas"

/**
 * Runs server-state (Task 4.2). Same shape as the agents/credentials
 * domains, plus polling: a run changes status in a background worker with
 * nothing to notify the browser, so the list refetches while any run is
 * still moving and goes quiet the moment they're all terminal.
 */

const POLL_INTERVAL_MS = 2000

async function fetchRuns(): Promise<RunSummary[]> {
  const { runs } = await apiFetch<{ runs: RunSummary[] }>("/runs")
  return runs
}

/** True while at least one run is still being worked on. */
export function hasActiveRuns(runs: RunSummary[] | undefined): boolean {
  return (runs ?? []).some((run) => !isTerminal(run.status))
}

export function runsQueryOptions() {
  return queryOptions({
    queryKey: runKeys.list(),
    queryFn: fetchRuns,
    // In-flight runs are stale the instant they're read.
    staleTime: 0,
    // Polling stops on its own once nothing is in flight, so an idle queue
    // costs no requests — no interval to tear down, no leak on unmount.
    refetchInterval: (query) =>
      hasActiveRuns(query.state.data) ? POLL_INTERVAL_MS : false,
  })
}

export function useRuns() {
  return useQuery(runsQueryOptions())
}

async function fetchRun(id: string): Promise<RunDetail> {
  const { run } = await apiFetch<{ run: RunDetail }>(`/runs/${id}`)
  return run
}

/**
 * A single run with its full `additional_data`. Polls on the same terms as
 * the list — while the run is moving, then stops — so an open detail page
 * follows a live run through its stages and goes quiet once it settles.
 */
export function runDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: runKeys.detail(id),
    queryFn: () => fetchRun(id),
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && !isTerminal(status) ? POLL_INTERVAL_MS : false
    },
  })
}

export function useRun(id: string) {
  return useQuery(runDetailQueryOptions(id))
}

/**
 * Submits a URL. The API returns 202 with the `queued` row, so the new run
 * lands in the list immediately and polling takes over from there.
 */
export function useCreateRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RelayProcessInput) => {
      const { run } = await apiFetch<{ run: RunSummary }>("/relay/process", {
        method: "POST",
        body: JSON.stringify(input),
      })
      return run
    },
    onSuccess: (run) => {
      queryClient.setQueryData<RunSummary[]>(runKeys.list(), (previous) =>
        previous ? [run, ...previous] : [run],
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: runKeys.lists() })
    },
  })
}

/** Optimistic delete — the row disappears immediately, restored on failure. */
export function useDeleteRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/runs/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: runKeys.lists() })
      const previous = queryClient.getQueryData<RunSummary[]>(runKeys.list())
      queryClient.setQueryData<RunSummary[]>(runKeys.list(), (runs) =>
        runs?.filter((run) => run.id !== id),
      )
      return { previous }
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(runKeys.list(), context.previous)
      }
    },
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: runKeys.lists() })
      queryClient.removeQueries({ queryKey: runKeys.detail(id) })
    },
  })
}

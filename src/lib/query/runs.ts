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
import type { RunDetail, RunPage, RunSummary } from "@/lib/runs"
import type { RelayProcessInput } from "@/lib/schemas"

/**
 * Runs server-state (Task 4.2). Same shape as the agents/credentials
 * domains, plus polling: a run changes status in a background worker with
 * nothing to notify the browser, so the list refetches while any run is
 * still moving and goes quiet the moment they're all terminal.
 */

const POLL_INTERVAL_MS = 2000

async function fetchRuns(page: number): Promise<RunPage> {
  return await apiFetch<RunPage>(`/runs?page=${page}`)
}

/**
 * True while at least one run ON THIS PAGE is still being worked on.
 *
 * Per-page on purpose. Polling exists to follow a run through its stages,
 * and the runs that are moving are the newest ones, which are on page 1.
 * Sitting on page 5 of old finished runs should cost no requests.
 */
export function hasActiveRuns(data: RunPage | undefined): boolean {
  return (data?.runs ?? []).some((run) => !isTerminal(run.status))
}

export function runsQueryOptions(page = 1) {
  return queryOptions({
    queryKey: runKeys.list(page),
    queryFn: () => fetchRuns(page),
    // In-flight runs are stale the instant they're read.
    staleTime: 0,
    // Polling stops on its own once nothing is in flight, so an idle queue
    // costs no requests — no interval to tear down, no leak on unmount.
    refetchInterval: (query) =>
      hasActiveRuns(query.state.data) ? POLL_INTERVAL_MS : false,
  })
}

export function useRuns(page = 1) {
  return useQuery(runsQueryOptions(page))
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

export interface RunLogLine {
  /** Stable per line; see `RunLogLine.id` in run-logs.ts. */
  id: string
  at: number
  level: string
  stage: string
  message: string
  fields?: Record<string, unknown>
}

export interface RunLogs {
  lines: RunLogLine[]
  /** "live" from Dragonfly, "history" once its TTL has passed. */
  source: "live" | "history"
}

/**
 * A run's log stream, fetched ONLY when a stage is expanded (`enabled`).
 *
 * Deliberately not folded into `useRun`. Logs are the largest thing on the
 * page and nobody reads them most visits, so making them part of the
 * detail payload would put hundreds of lines on the wire every two seconds
 * for every open run page. Gating on the disclosure means the cost is paid
 * by the person who asked for it.
 *
 * Polls faster than the detail query while the run is live, because that
 * is the one moment a log stream is worth watching, and stops dead once
 * the run is terminal — a finished run's logs cannot change.
 */
export function useRunLogs(
  id: string,
  options: { enabled: boolean; live: boolean },
) {
  return useQuery({
    queryKey: runKeys.logs(id),
    queryFn: () => apiFetch<RunLogs>(`/runs/${id}/logs`),
    enabled: options.enabled,
    staleTime: 0,
    refetchInterval: options.live ? POLL_INTERVAL_MS : false,
  })
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
      // Page 1 only, and trimmed: a new run is the newest, so it belongs at
      // the top of the first page and pushes the oldest row on that page
      // down onto page 2. Without the trim the first page would render 21
      // rows and quietly disagree with the pager beneath it.
      queryClient.setQueryData<RunPage>(runKeys.list(1), (previous) =>
        previous
          ? {
              ...previous,
              runs: [run, ...previous.runs].slice(0, previous.perPage),
              total: previous.total + 1,
            }
          : previous,
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
      // EVERY cached page, not just page 1. The row being deleted is on
      // whichever page the user is looking at, and after paging around
      // there is more than one page in the cache — targeting `list()`
      // alone left the visible row on screen until the refetch landed.
      const previous = queryClient.getQueriesData<RunPage>({
        queryKey: runKeys.lists(),
      })
      queryClient.setQueriesData<RunPage>(
        { queryKey: runKeys.lists() },
        (page) =>
          page?.runs.some((run) => run.id === id)
            ? {
                ...page,
                runs: page.runs.filter((run) => run.id !== id),
                total: Math.max(0, page.total - 1),
              }
            : page,
      )
      return { previous }
    },
    onError: (_error, _id, context) => {
      for (const [key, page] of context?.previous ?? []) {
        queryClient.setQueryData(key, page)
      }
    },
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: runKeys.lists() })
      queryClient.removeQueries({ queryKey: runKeys.detail(id) })
    },
  })
}

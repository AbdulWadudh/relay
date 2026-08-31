"use client"

import { Queue01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

import { QueryErrorState } from "@/components/query-error"
import { QueryStatusBar } from "@/components/query-status"
import { DeleteRun } from "@/components/queue/delete-run"
import { ExternalLink } from "@/components/queue/linkify"
import { NewRunDialog } from "@/components/queue/new-run-dialog"
import { RunStatusBadge } from "@/components/queue/run-status-badge"
import { RunsTableSkeleton } from "@/components/queue/runs-table-skeleton"
import { SourceIcon } from "@/components/queue/source-icon"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useRuns } from "@/lib/query/runs"
import type { RunSummary } from "@/lib/runs"

const dateFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
})

/** "3.2s" once a run reports a total; an em dash keeps the column's width. */
function duration(run: RunSummary): string {
  const total = run.timings.total_ms
  if (typeof total !== "number") return "—"
  return total < 1000 ? `${total}ms` : `${(total / 1000).toFixed(1)}s`
}

function RunTitle({ run }: { run: RunSummary }) {
  return (
    <div className="grid min-w-0 gap-1 leading-tight">
      {/* The title only exists after ingest, so the URL is the stable label
          and the title is added above it — the row never loses a line. */}
      <span className="flex min-w-0 items-center gap-2">
        <SourceIcon source={run.source} />
        <Link
          href={`/runs/${run.id}`}
          className="truncate font-medium underline-offset-4 transition-colors duration-200 hover:text-amber-700 hover:underline dark:hover:text-amber-400"
        >
          {run.title ?? run.sourceLabel}
        </Link>
      </span>
      {/* No icon here: the title line above already carries the source's
          brand mark, and repeating it on every row is noise. */}
      <ExternalLink
        href={run.sourceUrl}
        label={run.sourceUrl}
        showIcon={false}
        className="min-w-0 truncate font-mono text-muted-foreground text-xs hover:text-amber-700 dark:text-muted-foreground dark:hover:text-amber-400"
      />
    </div>
  )
}

function RunsEmpty() {
  return (
    <Empty className="rounded-lg border border-dashed transition-colors duration-300 hover:border-amber-500/40">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-amber-600 text-white">
          <HugeiconsIcon
            icon={Queue01Icon}
            strokeWidth={1.5}
            className="animate-pulse"
          />
        </EmptyMedia>
        <EmptyTitle>No runs yet</EmptyTitle>
        <EmptyDescription>
          Paste a public Reel or Short and Relay will extract the audio,
          transcribe it, and publish structured content to your destination.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <NewRunDialog full />
      </EmptyContent>
    </Empty>
  )
}

export function RunsTable() {
  const {
    data: runs,
    isPending,
    isError,
    error,
    dataUpdatedAt,
    isFetching,
    isStale,
    refetch,
  } = useRuns()

  if (isPending) return <RunsTableSkeleton />

  if (isError && !runs) {
    return (
      <QueryErrorState entity="runs" error={error} onRetry={() => refetch()} />
    )
  }

  const rows = runs ?? []

  return (
    <div className="flex flex-col gap-2">
      <QueryStatusBar
        entity="runs"
        isFetching={isFetching}
        isStale={isStale}
        updatedAt={dataUpdatedAt}
        isError={isError}
        onRefresh={() => refetch()}
      />

      {rows.length === 0 ? (
        <RunsEmpty />
      ) : (
        <>
          {/* Narrow viewports get a stacked card per run — a 5-column table
              can't fit, matching the Vault and Agents lists. */}
          <div className="flex flex-col gap-3 sm:hidden">
            {rows.map((run) => (
              <div
                key={run.id}
                className="rounded-lg border p-4 transition-colors duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <RunTitle run={run} />
                  <RunStatusBadge status={run.status} />
                </div>
                {run.error ? (
                  <p className="mt-2 text-red-700 text-xs dark:text-red-400">
                    {run.error}
                  </p>
                ) : null}
                <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
                  <span className="font-mono text-muted-foreground text-xs">
                    {dateFormat.format(run.createdAt)}
                  </span>
                  <DeleteRun runId={run.id} label={run.sourceLabel} />
                </div>
              </div>
            ))}
          </div>

          <div className="hidden rounded-lg border sm:block">
            {/* Fixed layout: every column except Source is sized to its own
                content, so Source absorbs all remaining width. Auto layout
                shared the space evenly and left the titles truncated to a
                few characters while Submitted sat half empty. Fixed layout
                is also what makes `truncate` inside the cells behave — under
                auto layout a truncating cell just grows the table instead. */}
            <Table className="min-w-[44rem] table-fixed">
              <TableHeader>
                <TableRow>
                  {/* No width: takes whatever the sized columns leave. */}
                  <TableHead>Source</TableHead>
                  {/* Sized to their widest real content, which also keeps a
                      status change (Queued -> Done) from reflowing anything. */}
                  <TableHead className="w-[8.5rem]">Status</TableHead>
                  <TableHead className="w-20">Duration</TableHead>
                  <TableHead className="hidden w-44 lg:table-cell">
                    Submitted
                  </TableHead>
                  <TableHead className="w-24 text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((run) => (
                  <TableRow
                    key={run.id}
                    className="transition-colors duration-200 hover:bg-muted"
                  >
                    <TableCell>
                      <RunTitle run={run} />
                      {run.error ? (
                        // TableCell bakes in `whitespace-nowrap`, which stops
                        // line-clamp from ever wrapping — the message would
                        // clip mid-word instead of filling two lines.
                        <p className="mt-1 line-clamp-2 whitespace-normal text-red-700 text-xs dark:text-red-400">
                          {run.error}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <RunStatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground text-xs">
                      {duration(run)}
                    </TableCell>
                    <TableCell className="hidden font-mono text-muted-foreground text-xs lg:table-cell">
                      {dateFormat.format(run.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-3">
                        <DeleteRun runId={run.id} label={run.sourceLabel} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}

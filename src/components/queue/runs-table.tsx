"use client"

import { Queue01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { type DataColumn, DataTable } from "@/components/data-table"
import { QueryErrorState } from "@/components/query-error"
import { QueryStatusBar } from "@/components/query-status"
import { DeleteRun } from "@/components/queue/delete-run"
import { ExternalLink } from "@/components/queue/linkify"
import { NewRunDialog } from "@/components/queue/new-run-dialog"
import { canRetry, RetryRun } from "@/components/queue/retry-run"
import { RunStatusBadge } from "@/components/queue/run-status-badge"
import { RunsPagination } from "@/components/queue/runs-pagination"
import { RunsTableSkeleton } from "@/components/queue/runs-table-skeleton"
import { SourceIcon } from "@/components/queue/source-icon"
import { ScrollPanel } from "@/components/scroll-panel"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
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

const RUN_COLUMNS: ReadonlyArray<DataColumn<RunSummary>> = [
  {
    id: "source",
    header: "Source",
    cell: (run) => (
      <>
        <RunTitle run={run} />
        {run.error ? (
          // TableCell bakes in `whitespace-nowrap`, which stops line-clamp
          // from ever wrapping — the message would clip mid-word instead of
          // filling two lines.
          <p className="mt-1 line-clamp-2 whitespace-normal text-red-700 text-xs dark:text-red-400">
            {run.error}
          </p>
        ) : null}
      </>
    ),
  },
  {
    id: "status",
    header: "Status",
    // Sized to their widest real content, which also keeps a status change
    // (Queued -> Done) from reflowing anything.
    className: "w-[8.5rem]",
    cell: (run) => <RunStatusBadge status={run.status} />,
  },
  {
    id: "duration",
    header: "Duration",
    className: "w-20",
    cellClassName: "font-mono text-muted-foreground text-xs",
    cell: (run) => duration(run),
  },
  {
    id: "submitted",
    header: "Submitted",
    className: "hidden w-44 lg:table-cell",
    cellClassName: "font-mono text-muted-foreground text-xs",
    cell: (run) => dateFormat.format(run.createdAt),
  },
  {
    id: "actions",
    header: "Actions",
    className: "w-32 text-end",
    cell: (run) => (
      <div className="flex items-center justify-end gap-1">
        {canRetry(run.status) ? <RetryRun run={run} /> : null}
        <DeleteRun runId={run.id} label={run.sourceLabel} />
      </div>
    ),
  },
]

export function RunsTable({ page = 1 }: { page?: number }) {
  const {
    data,
    isPending,
    isError,
    error,
    dataUpdatedAt,
    isFetching,
    isStale,
    refetch,
  } = useRuns(page)

  if (isPending) return <RunsTableSkeleton />

  if (isError && !data) {
    return (
      <QueryErrorState entity="runs" error={error} onRetry={() => refetch()} />
    )
  }

  const rows = data?.runs ?? []

  return (
    // The list-page shape (RULES.md, "List pages"): a fixed-height column
    // whose middle child is the only thing that scrolls.
    <div className="flex min-h-0 flex-1 flex-col gap-2">
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
          {/* Cards below lg, not sm: a tablet is wide enough to render the
              5-column table but not wide enough to fit it, so it used to
              overflow into a horizontal scrollbar. The skeleton switches at
              the same breakpoint or the layout jumps on load. */}
          <ScrollPanel bordered={false} className="lg:hidden">
            <div className="flex flex-col gap-3">
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
                    <div className="flex items-center gap-1">
                      {canRetry(run.status) ? <RetryRun run={run} /> : null}
                      <DeleteRun runId={run.id} label={run.sourceLabel} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollPanel>

          <DataTable
            className="hidden lg:flex"
            tableClassName="min-w-[44rem] table-fixed"
            rows={rows}
            rowKey={(run) => run.id}
            columns={RUN_COLUMNS}
          />

          {/* Outside both layouts: the cards and the table are two renderings
              of the same page, and the pager belongs to the page. */}
          <RunsPagination
            page={data?.page ?? page}
            total={data?.total ?? rows.length}
            perPage={data?.perPage ?? rows.length}
          />
        </>
      )}
    </div>
  )
}

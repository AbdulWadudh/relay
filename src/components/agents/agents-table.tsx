"use client"

import { Robot01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AgentFormDialog } from "@/components/agents/agent-form-dialog"
import { AgentStatusToggle } from "@/components/agents/agent-status-toggle"
import { AgentsTableSkeleton } from "@/components/agents/agents-table-skeleton"
import { DeleteAgent } from "@/components/agents/delete-agent"
import { QueryErrorState } from "@/components/query-error"
import { QueryStatusBar } from "@/components/query-status"
import { Badge } from "@/components/ui/badge"
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
import type { AgentSummary } from "@/lib/agents"
import { useAgents } from "@/lib/query/agents"
import { cn } from "@/lib/utils"

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" })

function TypeBadge({ type }: { type: AgentSummary["type"] }) {
  return (
    <Badge
      className={cn(
        "shrink-0 border-transparent text-white",
        type === "system" ? "bg-violet-600" : "bg-sky-600",
      )}
    >
      {type === "system" ? "System" : "Human"}
    </Badge>
  )
}

function RowActions({ agent }: { agent: AgentSummary }) {
  return (
    <div className="flex items-center justify-end gap-3">
      {/* Fixed-width wrapper matches the icon buttons' own size-8 footprint
          so the switch's narrower pill shape doesn't read as a bigger gap
          than the identical `gap-3` between the two icon buttons. */}
      <div className="flex size-8 items-center justify-center">
        <AgentStatusToggle agent={agent} />
      </div>
      {agent.type === "human" ? (
        <>
          <AgentFormDialog agent={agent} />
          <DeleteAgent agentId={agent.id} agentName={agent.name} />
        </>
      ) : null}
    </div>
  )
}

function AgentsEmpty() {
  return (
    <Empty className="fade-in zoom-in-95 animate-in rounded-lg border border-dashed fill-mode-both transition-colors duration-300 hover:border-emerald-500/40">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-emerald-600 text-white">
          <HugeiconsIcon
            icon={Robot01Icon}
            strokeWidth={1.5}
            className="animate-pulse"
          />
        </EmptyMedia>
        <EmptyTitle>No agents yet</EmptyTitle>
        <EmptyDescription>
          Create an agent to define how Relay extracts structured content from a
          category of video.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <AgentFormDialog />
      </EmptyContent>
    </Empty>
  )
}

export function AgentsTable() {
  const {
    data: agents,
    isPending,
    isError,
    error,
    isFetching,
    isStale,
    dataUpdatedAt,
    refetch,
  } = useAgents()

  // First load with nothing cached — the page's Suspense fallback normally
  // covers this, so it only shows if hydration was skipped.
  if (isPending) return <AgentsTableSkeleton />

  // Hard failure: no cached rows to fall back on.
  if (isError && !agents) {
    return (
      <QueryErrorState
        entity="agents"
        error={error}
        onRetry={() => refetch()}
      />
    )
  }

  const rows = agents ?? []

  return (
    <div className="flex flex-col gap-2">
      <QueryStatusBar
        entity="agents"
        isFetching={isFetching}
        isStale={isStale}
        isError={isError}
        updatedAt={dataUpdatedAt}
        onRefresh={() => refetch()}
      />

      {rows.length === 0 ? (
        <AgentsEmpty />
      ) : (
        <>
          {/* Narrow viewports can't fit a 4-column table — a stacked card
              per agent reads far better than a squeezed or horizontally
              scrolling grid, matching the Vault credentials list. */}
          <div className="flex flex-col gap-3 sm:hidden">
            {rows.map((agent) => (
              <div
                key={agent.id}
                className="fade-in slide-in-from-bottom-1 animate-in rounded-lg border fill-mode-both p-4 transition-colors duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid min-w-0 flex-1 gap-1 leading-tight">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{agent.name}</span>
                      <TypeBadge type={agent.type} />
                    </div>
                    <span className="line-clamp-2 text-muted-foreground text-xs">
                      {agent.description}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
                  <span className="font-mono text-muted-foreground text-xs">
                    Added {dateFormat.format(agent.createdAt)}
                  </span>
                  <RowActions agent={agent} />
                </div>
              </div>
            ))}
          </div>

          <div className="hidden rounded-lg border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((agent) => (
                  <TableRow
                    key={agent.id}
                    className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both transition-colors duration-200 hover:bg-muted"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{agent.name}</span>
                        <TypeBadge type={agent.type} />
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {agent.description}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground text-xs">
                      {dateFormat.format(agent.createdAt)}
                    </TableCell>
                    <TableCell>
                      <RowActions agent={agent} />
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

"use client"

import { Delete02Icon, Robot01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { DisabledActionSlot } from "@/components/agents/action-slot"
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
  /**
   * Deletable = anything that is not a SEEDED built-in.
   *
   * Human agents and synthesized ones both stay deleted. The two built-ins
   * do not: `seedSystemAgents` re-inserts a missing definition on the very
   * next run, so offering Delete there would look like it silently failed.
   * Deactivating them DOES stick — the seeder never touches `is_active` —
   * so the switch beside this is the real control for those.
   */
  const removable = !agent.builtin
  return (
    // Delete is disabled rather than omitted on built-in rows, so the
    // column never has a gap where a button should be.
    <div className="flex items-center justify-end gap-1">
      {/* Fixed width so the switch's narrow pill doesn't read as a wider
          gap than the one between the icons. */}
      <div className="flex size-8 items-center justify-center">
        <AgentStatusToggle agent={agent} />
      </div>
      <AgentFormDialog agent={agent} />
      {removable ? (
        <DeleteAgent agentId={agent.id} agentName={agent.name} />
      ) : (
        <DisabledActionSlot
          icon={Delete02Icon}
          label={`Remove ${agent.name}`}
          reason="Built-in agents come back on the next run — switch it off instead"
        />
      )}
    </div>
  )
}

function AgentsEmpty() {
  return (
    <Empty className="rounded-lg border border-dashed transition-colors duration-300 hover:border-emerald-500/40">
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
    dataUpdatedAt,
    isFetching,
    isStale,
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
        updatedAt={dataUpdatedAt}
        isError={isError}
        onRefresh={() => refetch()}
      />

      {rows.length === 0 ? (
        <AgentsEmpty />
      ) : (
        <>
          {/* Cards below lg, not sm: a tablet is wide enough to render the
              table but not wide enough to fit it, so it used to overflow
              into a horizontal scrollbar. The skeleton switches at the
              same breakpoint or the layout jumps on load. */}
          <div className="flex flex-col gap-3 lg:hidden">
            {rows.map((agent) => (
              <div
                key={agent.id}
                className="rounded-lg border p-4 transition-colors duration-200"
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

          <div className="hidden rounded-lg border lg:block">
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
                    className="transition-colors duration-200 hover:bg-muted"
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

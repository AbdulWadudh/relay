"use client"

import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import type { AgentSummary } from "@/lib/agents"
import { useUpdateAgent } from "@/lib/query/agents"

/**
 * The switch renders straight from the cached agent. `useUpdateAgent`
 * writes the new value optimistically, so the flip is instant and rolls
 * back on failure — no local copy of server state to keep in sync.
 */
export function AgentStatusToggle({ agent }: { agent: AgentSummary }) {
  const updateAgent = useUpdateAgent()
  // Every agent can be switched off, including built-ins — for those it is
  // the only way to stop routing to them, since deleting one just brings it
  // back on the next run.

  return (
    <Switch
      checked={agent.isActive}
      onCheckedChange={(isActive) =>
        updateAgent.mutate(
          { id: agent.id, input: { isActive } },
          {
            onError: () =>
              toast.add({ type: "error", title: "Could not update the agent" }),
          },
        )
      }
      disabled={updateAgent.isPending}
      aria-label={`${agent.name} active`}
    />
  )
}

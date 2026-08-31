"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import type { AgentSummary } from "@/lib/agents"

export function AgentStatusToggle({ agent }: { agent: AgentSummary }) {
  const router = useRouter()
  const [active, setActive] = useState(agent.isActive)
  const [pending, setPending] = useState(false)
  const editable = agent.type === "human"

  // Re-sync after router.refresh() brings fresh server data (e.g. editing
  // the agent through the form dialog) — this component instance doesn't
  // remount, so its optimistic local state would otherwise go stale.
  useEffect(() => {
    setActive(agent.isActive)
  }, [agent.isActive])

  async function toggleActive(next: boolean) {
    setActive(next)
    setPending(true)
    try {
      const response = await fetch(`/api/v1/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      router.refresh()
    } catch {
      setActive(!next)
      toast.add({ type: "error", title: "Could not update the agent" })
    } finally {
      setPending(false)
    }
  }

  return (
    <Switch
      checked={active}
      onCheckedChange={toggleActive}
      disabled={pending || !editable}
      aria-label={`${agent.name} active`}
    />
  )
}

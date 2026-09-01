"use client"

import * as React from "react"

import { toast } from "@/components/ui/toast"
import type { AgentSummary } from "@/lib/agents"
import { useAgents, useCreateAgent, useUpdateAgent } from "@/lib/query/agents"
import { ApiError } from "@/lib/query/http"

/**
 * Form state for the agent dialog. Only the draft the user is typing lives
 * here — the saved agent stays in the query cache, which the mutations
 * below update.
 *
 * FOUR MODES, and the difference is what the dialog can do:
 *  - `create` — empty form, POST.
 *  - `view`   — read-only. What a System agent opens as; it has no save
 *    path at all, only Close and Clone.
 *  - `edit`   — pre-filled, PUT to that SAME id. Creates nothing.
 *  - `clone`  — pre-filled from a source agent, POST. This is the only
 *    way a System agent produces something editable; the built-in itself
 *    is never modified.
 *
 * The dialog switches between them in place: pressing Clone while viewing
 * re-seeds the form as a clone rather than opening a second dialog.
 */

export type AgentFormMode = "create" | "view" | "edit" | "clone"

const DEFAULT_SCHEMA = { type: "object", properties: {}, required: [] }
const DEFAULT_CONFIG = {}

/**
 * "Recipe" -> "Recipe (copy)" -> "Recipe (copy 2)". Cloning an agent whose
 * name is already taken would otherwise fail the uniqueness check the
 * instant the dialog opened, which reads as the button being broken.
 */
export function suggestCopyName(base: string, taken: string[]): string {
  const used = new Set(taken.map((value) => value.trim().toLowerCase()))
  const candidate = `${base} (copy)`
  if (!used.has(candidate.toLowerCase())) return candidate
  for (let n = 2; n < 100; n++) {
    const next = `${base} (copy ${n})`
    if (!used.has(next.toLowerCase())) return next
  }
  return `${base} (copy ${Date.now()})`
}

export function useAgentForm(
  agent: AgentSummary | undefined,
  onDone: () => void,
  mode: AgentFormMode = agent ? "edit" : "create",
) {
  const isEdit = mode === "edit"
  const isClone = mode === "clone"
  const isView = mode === "view"
  const createAgent = useCreateAgent()
  const updateAgent = useUpdateAgent()
  const { data: existing } = useAgents()

  const initialName = React.useMemo(() => {
    if (!agent) return ""
    if (!isClone) return agent.name
    const humanNames = (existing ?? [])
      .filter((row) => row.type === "human")
      .map((row) => row.name)
    return suggestCopyName(agent.name, humanNames)
  }, [agent, isClone, existing])

  const [name, setName] = React.useState(initialName)
  // The dialog switches mode without unmounting (View -> Clone), so the
  // fields are re-seeded when it does.
  const modeRef = React.useRef(mode)
  const [description, setDescription] = React.useState(agent?.description ?? "")
  const [systemPrompt, setSystemPrompt] = React.useState(
    agent?.systemPrompt ?? "",
  )
  const [schema, setSchema] = React.useState<unknown>(
    agent?.expectedOutputSchema ?? DEFAULT_SCHEMA,
  )
  const [agentConfig, setAgentConfig] = React.useState<unknown>(
    agent?.config ?? DEFAULT_CONFIG,
  )
  const [isActive, setIsActive] = React.useState(agent?.isActive ?? true)

  React.useEffect(() => {
    if (modeRef.current === mode) return
    modeRef.current = mode
    setName(initialName)
    setDescription(agent?.description ?? "")
    setSystemPrompt(agent?.systemPrompt ?? "")
    setSchema(agent?.expectedOutputSchema ?? DEFAULT_SCHEMA)
    setAgentConfig(agent?.config ?? DEFAULT_CONFIG)
    setIsActive(agent?.isActive ?? true)
  }, [mode, initialName, agent])

  const pending = createAgent.isPending || updateAgent.isPending
  const invalid =
    name.trim().length === 0 ||
    description.trim().length === 0 ||
    systemPrompt.trim().length === 0

  function reset() {
    setName(initialName)
    setDescription(agent?.description ?? "")
    setSystemPrompt(agent?.systemPrompt ?? "")
    setSchema(agent?.expectedOutputSchema ?? DEFAULT_SCHEMA)
    setAgentConfig(agent?.config ?? DEFAULT_CONFIG)
    setIsActive(agent?.isActive ?? true)
  }

  async function submit() {
    const input = {
      name: name.trim(),
      description: description.trim(),
      systemPrompt: systemPrompt.trim(),
      expectedOutputSchema: schema as Record<string, unknown>,
      config: agentConfig as Record<string, unknown>,
      isActive,
    }

    try {
      // Only `edit` writes to an existing row; clone and create POST.
      if (isEdit && agent) {
        await updateAgent.mutateAsync({ id: agent.id, input })
      } else {
        await createAgent.mutateAsync(input)
      }
      toast.add({
        type: "success",
        title: isEdit
          ? "Agent updated"
          : isClone
            ? `Cloned to "${input.name}"`
            : "Agent created",
      })
      onDone()
    } catch (error) {
      const conflict = error instanceof ApiError && error.status === 409
      toast.add({
        type: "error",
        title: conflict
          ? "That name is taken"
          : isEdit
            ? "Could not update the agent"
            : isClone
              ? "Could not clone the agent"
              : "Could not create the agent",
        description: conflict ? (error as ApiError).message : undefined,
      })
    }
  }

  return {
    isEdit,
    isClone,
    isView,
    fields: {
      name,
      setName,
      description,
      setDescription,
      systemPrompt,
      setSystemPrompt,
      schema,
      setSchema,
      agentConfig,
      setAgentConfig,
      isActive,
      setIsActive,
    },
    pending,
    invalid,
    reset,
    submit,
  }
}

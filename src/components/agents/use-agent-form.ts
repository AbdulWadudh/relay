"use client"

import * as React from "react"

import { toast } from "@/components/ui/toast"
import type { AgentSummary } from "@/lib/agents"
import { useCreateAgent, useUpdateAgent } from "@/lib/query/agents"

/**
 * Form state for the agent create/edit dialog. Only the draft the user is
 * typing lives here — the saved agent stays in the query cache, which the
 * mutations below update.
 */

const DEFAULT_SCHEMA = { type: "object", properties: {}, required: [] }
const DEFAULT_CONFIG = {}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

export function useAgentForm(
  agent: AgentSummary | undefined,
  onDone: () => void,
) {
  const isEdit = Boolean(agent)
  const createAgent = useCreateAgent()
  const updateAgent = useUpdateAgent()

  const [name, setName] = React.useState(agent?.name ?? "")
  const [description, setDescription] = React.useState(agent?.description ?? "")
  const [systemPrompt, setSystemPrompt] = React.useState(
    agent?.systemPrompt ?? "",
  )
  const [schemaText, setSchemaText] = React.useState(
    pretty(agent?.expectedOutputSchema ?? DEFAULT_SCHEMA),
  )
  const [configText, setConfigText] = React.useState(
    pretty(agent?.config ?? DEFAULT_CONFIG),
  )
  const [isActive, setIsActive] = React.useState(agent?.isActive ?? true)
  const [schemaError, setSchemaError] = React.useState<string | null>(null)
  const [configError, setConfigError] = React.useState<string | null>(null)

  const pending = createAgent.isPending || updateAgent.isPending
  const invalid =
    name.trim().length === 0 ||
    description.trim().length === 0 ||
    systemPrompt.trim().length === 0

  function reset() {
    setName(agent?.name ?? "")
    setDescription(agent?.description ?? "")
    setSystemPrompt(agent?.systemPrompt ?? "")
    setSchemaText(pretty(agent?.expectedOutputSchema ?? DEFAULT_SCHEMA))
    setConfigText(pretty(agent?.config ?? DEFAULT_CONFIG))
    setIsActive(agent?.isActive ?? true)
    setSchemaError(null)
    setConfigError(null)
  }

  async function submit() {
    let expectedOutputSchema: Record<string, unknown>
    try {
      expectedOutputSchema = JSON.parse(schemaText)
    } catch {
      setSchemaError("That's not valid JSON.")
      return
    }
    let config: Record<string, unknown>
    try {
      config = JSON.parse(configText)
    } catch {
      setConfigError("That's not valid JSON.")
      return
    }
    setSchemaError(null)
    setConfigError(null)

    const input = {
      name: name.trim(),
      description: description.trim(),
      systemPrompt: systemPrompt.trim(),
      expectedOutputSchema,
      config,
      isActive,
    }

    try {
      // Editing applies optimistically through the shared update mutation;
      // creating waits for the server-assigned row.
      if (isEdit && agent) {
        await updateAgent.mutateAsync({ id: agent.id, input })
      } else {
        await createAgent.mutateAsync(input)
      }
      toast.add({
        type: "success",
        title: isEdit ? "Agent updated" : "Agent created",
      })
      onDone()
    } catch {
      toast.add({
        type: "error",
        title: isEdit
          ? "Could not update the agent"
          : "Could not create the agent",
      })
    }
  }

  return {
    isEdit,
    fields: {
      name,
      setName,
      description,
      setDescription,
      systemPrompt,
      setSystemPrompt,
      schemaText,
      setSchemaText,
      configText,
      setConfigText,
      isActive,
      setIsActive,
    },
    errors: { schemaError, setSchemaError, configError, setConfigError },
    pending,
    invalid,
    reset,
    submit,
  }
}

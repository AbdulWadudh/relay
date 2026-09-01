"use client"

import {
  Add01Icon,
  Copy01Icon,
  PencilEdit02Icon,
  Robot01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { AgentFormFields } from "@/components/agents/agent-form-fields"
import {
  type AgentFormMode,
  useAgentForm,
} from "@/components/agents/use-agent-form"
import { Modal } from "@/components/modal"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { AgentSummary } from "@/lib/agents"

/**
 * The single dialog behind every agent action. A System agent opens
 * read-only with Close and Clone; a Human agent opens editable with Close,
 * Clone and Save. Clone switches mode in place rather than opening a
 * second dialog.
 */

function initialModeFor(agent: AgentSummary | undefined): AgentFormMode {
  if (!agent) return "create"
  return agent.type === "system" ? "view" : "edit"
}

export function AgentFormDialog({ agent }: { agent?: AgentSummary }) {
  const [open, setOpen] = React.useState(false)
  const initialMode = initialModeFor(agent)
  const [mode, setMode] = React.useState<AgentFormMode>(initialMode)

  const { isView, isEdit, isClone, fields, pending, invalid, reset, submit } =
    useAgentForm(agent, () => onOpenChange(false), mode)

  // Every close path goes through here, so the mode always resets.
  function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setMode(initialMode)
      reset()
    }
  }

  const close = () => onOpenChange(false)

  const triggerLabel = agent
    ? `${agent.type === "system" ? "View" : "Edit"} / Clone ${agent.name}`
    : "Create Agent"

  // Must be one element DialogTrigger can clone; the tooltip is Modal's
  // job (Tooltip > DialogTrigger > Button).
  const trigger = agent ? (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={triggerLabel}
      className="transition-all duration-200 hover:-translate-y-px hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600"
    >
      <HugeiconsIcon
        icon={agent.type === "system" ? ViewIcon : PencilEdit02Icon}
        strokeWidth={1.5}
      />
    </Button>
  ) : (
    <Button className="transition-all duration-200 hover:-translate-y-px">
      <HugeiconsIcon
        icon={Add01Icon}
        data-icon="inline-start"
        className="transition-transform duration-300 group-hover/button:rotate-90"
      />
      Create Agent
    </Button>
  )

  const cloneButton = (
    <Button
      variant="outline"
      onClick={() => setMode("clone")}
      className="transition-all duration-200 hover:-translate-y-px"
    >
      <HugeiconsIcon
        icon={Copy01Icon}
        data-icon="inline-start"
        strokeWidth={1.5}
      />
      Clone
    </Button>
  )

  const saveButton = (
    <Button onClick={submit} disabled={invalid || pending}>
      {pending ? <Spinner data-icon="inline-start" /> : null}
      {isEdit ? "Save changes" : isClone ? "Create clone" : "Create agent"}
    </Button>
  )

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      triggerTooltip={agent ? triggerLabel : undefined}
      icon={isClone ? Copy01Icon : Robot01Icon}
      accent={isClone ? "violet" : isView ? "amber" : "emerald"}
      size="lg"
      title={
        isClone
          ? `Clone ${agent?.name}`
          : isView
            ? agent?.name
            : isEdit
              ? "Edit agent"
              : "Create an agent"
      }
      subtitle={
        isClone
          ? "Creates a new agent from this one. The original is left exactly as it is."
          : isView
            ? "A built-in agent. It can't be changed — clone it to make a version you own."
            : isEdit
              ? "Saves back to this agent. No copy is created."
              : "Agents turn a system prompt and a JSON Schema into a repeatable extraction pass over processed content."
      }
      footer={
        isClone || mode === "create" ? (
          <>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            {saveButton}
          </>
        ) : (
          <>
            <Button variant="outline" onClick={close}>
              Close
            </Button>
            {cloneButton}
            {isEdit ? saveButton : null}
          </>
        )
      }
    >
      <AgentFormFields fields={fields} readOnly={isView} />
    </Modal>
  )
}

"use client"

import { Add01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRouter } from "next/navigation"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { AgentSummary } from "@/lib/agents"

const DEFAULT_SCHEMA = {
  type: "object",
  properties: {},
  required: [],
}

const DEFAULT_CONFIG = {}

export function AgentFormDialog({ agent }: { agent?: AgentSummary }) {
  const isEdit = Boolean(agent)
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState(agent?.name ?? "")
  const [description, setDescription] = React.useState(agent?.description ?? "")
  const [systemPrompt, setSystemPrompt] = React.useState(
    agent?.systemPrompt ?? "",
  )
  const [schemaText, setSchemaText] = React.useState(
    JSON.stringify(agent?.expectedOutputSchema ?? DEFAULT_SCHEMA, null, 2),
  )
  const [configText, setConfigText] = React.useState(
    JSON.stringify(agent?.config ?? DEFAULT_CONFIG, null, 2),
  )
  const [isActive, setIsActive] = React.useState(agent?.isActive ?? true)
  const [schemaError, setSchemaError] = React.useState<string | null>(null)
  const [configError, setConfigError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  function reset() {
    setName(agent?.name ?? "")
    setDescription(agent?.description ?? "")
    setSystemPrompt(agent?.systemPrompt ?? "")
    setSchemaText(
      JSON.stringify(agent?.expectedOutputSchema ?? DEFAULT_SCHEMA, null, 2),
    )
    setConfigText(JSON.stringify(agent?.config ?? DEFAULT_CONFIG, null, 2))
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
    setPending(true)
    try {
      const response = await fetch(
        isEdit ? `/api/v1/agents/${agent?.id}` : "/api/v1/agents",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            systemPrompt: systemPrompt.trim(),
            expectedOutputSchema,
            config,
            isActive,
          }),
        },
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      toast.add({
        type: "success",
        title: isEdit ? "Agent updated" : "Agent created",
      })
      setOpen(false)
      router.refresh()
    } catch {
      toast.add({
        type: "error",
        title: isEdit
          ? "Could not update the agent"
          : "Could not create the agent",
      })
    } finally {
      setPending(false)
    }
  }

  const invalid =
    name.trim().length === 0 ||
    description.trim().length === 0 ||
    systemPrompt.trim().length === 0

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      {isEdit ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="transition-all duration-200 hover:scale-110 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600"
                    aria-label={`Edit ${agent?.name}`}
                  />
                }
              />
            }
          >
            <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={1.5} />
          </TooltipTrigger>
          <TooltipContent>Edit {agent?.name}</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger
          render={
            <Button className="transition-all duration-200 hover:scale-[1.03]" />
          }
        >
          <HugeiconsIcon
            icon={Add01Icon}
            data-icon="inline-start"
            className="transition-transform duration-300 group-hover/button:rotate-90"
          />
          Create Agent
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEdit ? "Edit agent" : "Create an agent"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Agents turn a system prompt and a JSON Schema into a repeatable
            extraction pass over processed content.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="agent-name">Name</FieldLabel>
            <Input
              id="agent-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Recipe extractor"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="agent-description">Description</FieldLabel>
            <Input
              id="agent-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Pulls out recipe titles and ingredient lists"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="agent-prompt">System prompt</FieldLabel>
            <Textarea
              id="agent-prompt"
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              placeholder="You are an expert at extracting..."
              className="min-h-32 font-mono text-xs"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="agent-schema">
              Expected output schema
            </FieldLabel>
            <Textarea
              id="agent-schema"
              value={schemaText}
              onChange={(event) => {
                setSchemaText(event.target.value)
                setSchemaError(null)
              }}
              aria-invalid={Boolean(schemaError)}
              className="min-h-40 font-mono text-xs"
            />
            <FieldDescription className={schemaError ? "text-destructive" : ""}>
              {schemaError ?? "A JSON Schema describing the extracted fields."}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="agent-config">Config</FieldLabel>
            <Textarea
              id="agent-config"
              value={configText}
              onChange={(event) => {
                setConfigText(event.target.value)
                setConfigError(null)
              }}
              aria-invalid={Boolean(configError)}
              className="min-h-24 font-mono text-xs"
            />
            <FieldDescription className={configError ? "text-destructive" : ""}>
              {configError ?? "Free-form JSON for agent-specific settings."}
            </FieldDescription>
          </Field>
          <Field orientation="horizontal">
            <FieldLabel htmlFor="agent-active">
              Active
              <FieldDescription>
                Inactive agents are hidden from the processing pipeline.
              </FieldDescription>
            </FieldLabel>
            <Switch
              id="agent-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </Field>
        </FieldGroup>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={invalid || pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {isEdit ? "Save changes" : "Create agent"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

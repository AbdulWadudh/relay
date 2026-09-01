"use client"

import type { useAgentForm } from "@/components/agents/use-agent-form"
import { JsonInput, JsonView } from "@/components/json-view"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

/**
 * The agent dialog's body. Under `readOnly` the JSON editors swap to the
 * viewer rather than being disabled — a disabled editor still shows
 * add/edit/delete affordances on every node.
 */
export function AgentFormFields({
  fields,
  readOnly,
}: {
  fields: ReturnType<typeof useAgentForm>["fields"]
  readOnly: boolean
}) {
  const {
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
  } = fields

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="agent-name">Name</FieldLabel>
        <Input
          id="agent-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Recipe extractor"
          disabled={readOnly}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="agent-description">Description</FieldLabel>
        <Input
          id="agent-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Pulls out recipe titles and ingredient lists"
          disabled={readOnly}
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
          disabled={readOnly}
        />
      </Field>
      <Field>
        <FieldLabel>Expected output schema</FieldLabel>
        {readOnly ? (
          <JsonView data={schema} searchable={false} collapse={2} />
        ) : (
          <JsonInput value={schema} onChange={setSchema} />
        )}
        <FieldDescription>
          A JSON Schema describing the extracted fields. Every property should
          carry an evidence object.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel>Config</FieldLabel>
        {readOnly ? (
          <JsonView data={agentConfig} searchable={false} collapse={1} />
        ) : (
          <JsonInput
            value={agentConfig}
            onChange={setAgentConfig}
            collapse={1}
          />
        )}
        <FieldDescription>
          Free-form JSON for agent-specific settings.
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
          disabled={readOnly}
        />
      </Field>
    </FieldGroup>
  )
}

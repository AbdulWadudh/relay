"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { type AiKeyProviderId, KEYED_AI_PROVIDERS } from "@/lib/providers"
import { useCreateCredential } from "@/lib/query/credentials"

/**
 * BYOK key entry, lifted out of the old standalone dialog so it can sit in
 * the "API key" tab (src/components/vault/add-credential-dialog.tsx).
 *
 * Only KEYED providers are offered — a keyless one like local Ollama has no
 * key to paste and would be a dead option.
 */

export function ApiKeyForm({ onDone }: { onDone: () => void }) {
  const createCredential = useCreateCredential()
  const [provider, setProvider] = React.useState<AiKeyProviderId | null>(null)
  const [apiKey, setApiKey] = React.useState("")
  const [account, setAccount] = React.useState("")
  const pending = createCredential.isPending
  const invalid = !provider || apiKey.trim().length === 0

  async function submit() {
    if (invalid || pending || !provider) return
    try {
      await createCredential.mutateAsync({
        type: "api_key",
        provider,
        accessToken: apiKey.trim(),
        // `account_name` is the generic identity key the vault and UI
        // already consume for Ray credentials, so an API key recorded here
        // renders in the same Account column.
        ...(account.trim().length > 0
          ? { metaData: { account_name: account.trim() } }
          : {}),
      })
      toast.add({ type: "success", title: "Key stored in the vault" })
      setProvider(null)
      setApiKey("")
      setAccount("")
      onDone()
    } catch {
      toast.add({ type: "error", title: "Could not store the key" })
    }
  }

  return (
    <>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="vault-provider">Provider</FieldLabel>
          <Select
            items={KEYED_AI_PROVIDERS.map((p) => ({
              label: p.label,
              value: p.id,
            }))}
            value={provider}
            onValueChange={(value) => setProvider(value as AiKeyProviderId)}
          >
            <SelectTrigger id="vault-provider" className="w-full">
              <SelectValue placeholder="Select a provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {KEYED_AI_PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="vault-key">API key</FieldLabel>
          <Input
            id="vault-key"
            type="password"
            autoComplete="off"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <FieldDescription>
            Used server-side only for transcription and extraction calls.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="vault-account">Account (optional)</FieldLabel>
          <Input
            id="vault-account"
            autoComplete="off"
            placeholder="e.g. abdul@example.com"
            maxLength={120}
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
          <FieldDescription>
            Which account this key was generated from, so you can tell two keys
            for the same provider apart.
          </FieldDescription>
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={invalid || pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Store key
        </Button>
      </div>
    </>
  )
}

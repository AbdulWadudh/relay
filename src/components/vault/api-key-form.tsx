"use client"

import * as React from "react"

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { ProviderPicker } from "@/components/vault/provider-picker"
import { type AiKeyProviderId, providerLabel } from "@/lib/providers"
import { useCreateCredential } from "@/lib/query/credentials"

/**
 * BYOK key entry for the "API key" tab.
 *
 * Renders a real <form> with an id, so the dialog's shared footer can
 * submit it from outside the panel via the button's `form` attribute — no
 * lifted field state, and Enter submits the way a form should.
 *
 * Progressive disclosure: the key and account fields appear once a provider
 * is chosen. An empty "sk-..." box before Relay knows which service it
 * belongs to asks the second question first.
 */

export interface ApiKeyFormState {
  canSubmit: boolean
  pending: boolean
}

export function ApiKeyForm({
  formId,
  onStateChange,
  onStored,
}: {
  formId: string
  onStateChange: (state: ApiKeyFormState) => void
  onStored: () => void
}) {
  const createCredential = useCreateCredential()
  const [provider, setProvider] = React.useState<AiKeyProviderId | null>(null)
  const [apiKey, setApiKey] = React.useState("")
  const [account, setAccount] = React.useState("")

  const canSubmit = Boolean(provider) && apiKey.trim().length > 0
  const pending = createCredential.isPending

  // The footer button lives outside this component, so it needs to be told
  // when it may be pressed.
  React.useEffect(() => {
    onStateChange({ canSubmit, pending })
  }, [canSubmit, pending, onStateChange])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit || pending || !provider) return
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
      onStored()
    } catch {
      toast.add({ type: "error", title: "Could not store the key" })
    }
  }

  return (
    <form id={formId} onSubmit={submit}>
      <ProviderPicker
        value={provider}
        onChange={(id) => setProvider(id as AiKeyProviderId)}
      />

      {provider ? (
        <div className="fade-in slide-in-from-top-1 animate-in pt-4 duration-300 motion-reduce:animate-none">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="vault-key">
                {providerLabel(provider)} API key
              </FieldLabel>
              <Input
                id="vault-key"
                type="password"
                autoComplete="off"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <FieldDescription>
                Encrypted with AES-256-GCM before it is stored, and used
                server-side only.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="vault-account">
                Account (optional)
              </FieldLabel>
              <Input
                id="vault-account"
                autoComplete="off"
                placeholder="e.g. abdul@example.com"
                maxLength={120}
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              />
              <FieldDescription>
                Which account this key came from, so two keys for the same
                provider are tellable apart.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </div>
      ) : (
        <p className="pt-6 text-center text-muted-foreground text-sm">
          Choose a provider to continue.
        </p>
      )}
    </form>
  )
}

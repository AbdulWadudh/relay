"use client"

import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQueryClient } from "@tanstack/react-query"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { AddConnectionDialog } from "@/components/vault/add-connection-dialog"
import { AI_KEY_PROVIDERS, type AiKeyProviderId } from "@/lib/providers"
import { useCreateCredential } from "@/lib/query/credentials"
import { credentialKeys } from "@/lib/query/keys"

export function VaultActions({ configuredIds }: { configuredIds: string[] }) {
  return (
    <>
      <AddConnectionDialog configuredIds={configuredIds} />
      <AddCredentialDialog />
    </>
  )
}

function AddCredentialDialog() {
  const createCredential = useCreateCredential()
  const [open, setOpen] = React.useState(false)
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
        // already consume for Ray credentials, so an API key recorded
        // here renders in the same Account column.
        ...(account.trim().length > 0
          ? { metaData: { account_name: account.trim() } }
          : {}),
      })
      toast.add({ type: "success", title: "Key stored in the vault" })
      setOpen(false)
      setProvider(null)
      setApiKey("")
      setAccount("")
    } catch {
      toast.add({ type: "error", title: "Could not store the key" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="transition-all duration-200 hover:-translate-y-px" />
        }
      >
        <HugeiconsIcon
          icon={Add01Icon}
          data-icon="inline-start"
          className="transition-transform duration-300 group-hover/button:rotate-90"
        />
        Add API Key
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Add API key</DialogTitle>
          <DialogDescription className="text-sm">
            The key is encrypted with AES-256-GCM before it touches the
            database.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="vault-provider">Provider</FieldLabel>
            <Select
              items={AI_KEY_PROVIDERS.map((p) => ({
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
                  {AI_KEY_PROVIDERS.map((p) => (
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
              Which account this key was generated from, so you can tell two
              keys for the same provider apart.
            </FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={invalid || pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Store key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Surfaces Ray redirect results (?connected= / ?error=) as toasts. */
export function VaultNotices() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()

  React.useEffect(() => {
    const connected = params.get("connected")
    const error = params.get("error")
    if (!connected && !error) return
    if (connected === "notion") {
      // The OAuth callback wrote the credential server-side, outside any
      // mutation, so the cached list has to be refetched explicitly.
      queryClient.invalidateQueries({ queryKey: credentialKeys.lists() })
      toast.add({ type: "success", title: "Notion workspace connected" })
    } else if (error) {
      toast.add({
        type: "error",
        title: "Notion connection failed",
        description: "Check this Ray's configuration and try again.",
      })
    }
    router.replace(pathname, { scroll: false })
  }, [params, router, pathname, queryClient])

  return null
}

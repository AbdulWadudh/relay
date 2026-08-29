"use client"

import { Add01Icon, Notion01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
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

const API_PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "groq", label: "Groq" },
  { value: "gemini", label: "Gemini" },
] as const

export function VaultActions({
  notionConnected,
  notionReady,
}: {
  notionConnected: boolean
  notionReady: boolean
}) {
  const label = notionConnected ? "Reconnect Notion" : "Connect Notion"
  return (
    <>
      {notionReady ? (
        <Button variant="outline" render={<a href="/api/v1/oauth/notion" />}>
          <HugeiconsIcon icon={Notion01Icon} data-icon="inline-start" />
          {label}
        </Button>
      ) : (
        <Button
          variant="outline"
          disabled
          title="Set NOTION_CLIENT_ID and NOTION_CLIENT_SECRET in .env.local first"
        >
          <HugeiconsIcon icon={Notion01Icon} data-icon="inline-start" />
          {label}
        </Button>
      )}
      <AddCredentialDialog />
    </>
  )
}

function AddCredentialDialog() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [provider, setProvider] = React.useState<string | null>(null)
  const [apiKey, setApiKey] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const invalid = !provider || apiKey.trim().length === 0

  async function submit() {
    if (invalid || pending) return
    setPending(true)
    try {
      const response = await fetch("/api/v1/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "api_key",
          provider,
          accessToken: apiKey.trim(),
        }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      toast.add({ type: "success", title: "Key stored in the vault" })
      setOpen(false)
      setProvider(null)
      setApiKey("")
      router.refresh()
    } catch {
      toast.add({ type: "error", title: "Could not store the key" })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
        Add API Key
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add API key</DialogTitle>
          <DialogDescription>
            The key is encrypted with AES-256-GCM before it touches the
            database.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="vault-provider">Provider</FieldLabel>
            <Select
              items={API_PROVIDERS.map((p) => ({
                label: p.label,
                value: p.value,
              }))}
              value={provider}
              onValueChange={(value) => setProvider(value as string)}
            >
              <SelectTrigger id="vault-provider" className="w-full">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {API_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
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

/** Surfaces OAuth redirect results (?connected= / ?error=) as toasts. */
export function VaultNotices() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    const connected = params.get("connected")
    const error = params.get("error")
    if (!connected && !error) return
    if (connected === "notion") {
      toast.add({ type: "success", title: "Notion workspace connected" })
    } else if (error) {
      toast.add({
        type: "error",
        title: "Notion connection failed",
        description: "Check the OAuth configuration and try again.",
      })
    }
    router.replace(pathname, { scroll: false })
  }, [params, router, pathname])

  return null
}

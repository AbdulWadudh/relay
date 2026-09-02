"use client"

import { File01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { CookieImportSteps } from "@/components/vault/cookie-import-steps"
import { providerLabel } from "@/lib/providers"
import { useImportCookies } from "@/lib/query/social"
import { socialProvider } from "@/lib/social/providers"

/**
 * Imports a browser-exported cookies.txt (SESSION_AUTH.md §2).
 *
 * Replaced ConnectSessionDialog and its remote-controlled Chromium. The
 * user's password no longer travels through this server at all, which
 * retires risk #3 outright rather than disclosing it.
 *
 * The jar lives in component state and dies with the dialog: it is never
 * put in a query cache, a ref that outlives the mount, or a toast.
 */

export function ImportSessionDialog({
  provider: providerId,
  open,
  onOpenChange,
}: {
  provider: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const provider = socialProvider(providerId)
  const importCookies = useImportCookies()
  const [jar, setJar] = React.useState("")
  const [label, setLabel] = React.useState("")
  const [fileName, setFileName] = React.useState<string | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const name = providerLabel(providerId)

  // Cleared on close so a jar cannot survive into the next open.
  React.useEffect(() => {
    if (open) return
    setJar("")
    setLabel("")
    setFileName(null)
  }, [open])

  if (!provider) return null

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setJar(await file.text())
    // Reset so re-picking the SAME file still fires a change event.
    event.target.value = ""
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!jar.trim() || importCookies.isPending) return
    importCookies.mutate(
      {
        provider: providerId,
        cookieJar: jar,
        label: label.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          toast.add({
            type: "success",
            title: `${name} session connected`,
            description:
              result.discarded > 0
                ? `Kept ${result.kept} ${name} cookies and discarded ${result.discarded} belonging to other sites.`
                : `Kept ${result.kept} cookies.`,
          })
          onOpenChange(false)
        },
        onError: (error) => {
          // The server's 422 messages are written for the user and name
          // the fix, so they are surfaced as-is.
          toast.add({
            type: "error",
            title: "That export could not be used",
            description:
              error instanceof Error ? error.message : "Try exporting again.",
          })
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Connect {name}</DialogTitle>
          <DialogDescription>
            Export your session from a browser you are already signed in to.
            Relay never sees your password.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55svh] pr-4">
          <form id="import-session" onSubmit={submit} className="space-y-6">
            <CookieImportSteps provider={provider} />

            <div className="space-y-3">
              {/*
                A hidden native file input driven by a real Button. RULES.md
                bans native controls in the UI, and this one renders nothing
                — the browser exposes no other way to open a file picker.
              */}
              <input
                ref={fileRef}
                type="file"
                accept=".txt,text/plain"
                onChange={onFile}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  className="transition-colors hover:border-violet-600 hover:text-violet-700 dark:hover:text-violet-300"
                >
                  <HugeiconsIcon icon={File01Icon} size={16} strokeWidth={2} />
                  Choose cookies.txt
                </Button>
                {fileName ? (
                  <span className="truncate font-mono text-muted-foreground text-xs">
                    {fileName}
                  </span>
                ) : null}
              </div>

              <Field>
                <FieldLabel htmlFor="cookie-jar">Or paste it here</FieldLabel>
                <Textarea
                  id="cookie-jar"
                  value={jar}
                  onChange={(event) => setJar(event.target.value)}
                  rows={5}
                  spellCheck={false}
                  // A jar is a bearer token; keep it out of autofill and
                  // out of the browser's spell-check upload path.
                  autoComplete="off"
                  placeholder="# Netscape HTTP Cookie File"
                  className="font-mono text-xs"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="account-label">
                  Account name (optional)
                </FieldLabel>
                <Input
                  id="account-label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder={`How you'll recognise this ${name} account`}
                  maxLength={80}
                />
              </Field>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="import-session"
            disabled={!jar.trim() || importCookies.isPending}
          >
            {importCookies.isPending ? <Spinner /> : null}
            Connect {name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { File01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

/**
 * The last step's fields: pick the exported file, or paste it, and name the
 * account.
 *
 * Split out of import-session-dialog.tsx to keep that file under the 250
 * line cap (RULES.md:56). The jar itself stays in the PARENT's state, not
 * here — it dies with the dialog, and a second copy in a child that
 * unmounts on step change is a second lifetime to reason about.
 */

export const IMPORT_FORM_ID = "import-session"

export function ImportUploadForm({
  providerName,
  jar,
  onJarChange,
  label,
  onLabelChange,
  onSubmit,
}: {
  providerName: string
  jar: string
  onJarChange: (jar: string) => void
  label: string
  onLabelChange: (label: string) => void
  onSubmit: (event: React.FormEvent) => void
}) {
  // Display only, so it lives here rather than in the parent's state.
  const [fileName, setFileName] = React.useState<string | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    onJarChange(await file.text())
    // Reset so re-picking the SAME file still fires a change event.
    event.target.value = ""
  }

  return (
    <form id={IMPORT_FORM_ID} onSubmit={onSubmit} className="mt-4 space-y-4">
      {/*
        A hidden native file input driven by a real Button. RULES.md bans
        native controls in the UI, and this one renders nothing — the browser
        exposes no other way to open a file picker.
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
          className="transition-colors hover:border-violet-600 hover:text-violet-700 active:scale-[0.98] dark:hover:text-violet-300"
        >
          <HugeiconsIcon icon={File01Icon} size={16} strokeWidth={2} />
          Choose cookies.txt
        </Button>
        {fileName ? (
          <span className="motion-safe:fade-in motion-safe:animate-in truncate font-mono text-muted-foreground text-xs">
            {fileName}
          </span>
        ) : null}
      </div>

      <Field>
        <FieldLabel htmlFor="cookie-jar">Or paste it</FieldLabel>
        <Textarea
          id="cookie-jar"
          value={jar}
          onChange={(event) => onJarChange(event.target.value)}
          rows={4}
          spellCheck={false}
          // A jar is a bearer token; keep it out of autofill and out of the
          // browser's spell-check upload path.
          autoComplete="off"
          placeholder="# Netscape HTTP Cookie File"
          className="font-mono text-xs"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="account-label">Account name (optional)</FieldLabel>
        <Input
          id="account-label"
          value={label}
          onChange={(event) => onLabelChange(event.target.value)}
          placeholder={`How you'll recognise this ${providerName} account`}
          maxLength={80}
        />
      </Field>
    </form>
  )
}

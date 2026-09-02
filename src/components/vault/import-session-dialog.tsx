"use client"

import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  File01Icon,
} from "@hugeicons/core-free-icons"
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
import { ConnectRail } from "@/components/vault/connect-rail"
import {
  CONNECT_STEPS,
  ConnectStepBody,
} from "@/components/vault/cookie-import-steps"
import { providerLabel } from "@/lib/providers"
import { useImportCookies } from "@/lib/query/social"
import { socialProvider } from "@/lib/social/providers"

/**
 * Guided import of a browser-exported session (SESSION_AUTH.md §2).
 *
 * Replaced ConnectSessionDialog and its remote-controlled Chromium. The
 * user's password no longer travels through this server at all, which
 * retires risk #3 outright rather than disclosing it.
 *
 * One step at a time on purpose: the four actions happen in a DIFFERENT
 * application (a browser extension), so a single scrolling wall of text
 * loses the user's place every time they tab away and come back.
 *
 * The jar lives in component state and dies with the dialog — never a
 * query cache, never a ref that outlives the mount, never a toast.
 */

export function ImportSessionDialog({
  provider: providerId,
  open,
  onOpenChange,
  replaces,
  defaultLabel,
}: {
  provider: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Set when the wizard was opened from a Vault row's Reconnect action:
   * the credential this import supersedes. Without it a provider that
   * exposes no account id would gain a second row beside the old one.
   */
  replaces?: string
  /** The replaced credential's label, so reconnecting does not lose it. */
  defaultLabel?: string
}) {
  const provider = socialProvider(providerId)
  const importCookies = useImportCookies()
  const [step, setStep] = React.useState(0)
  // Which way the user is travelling, so the panel slides in from the side
  // they came from. Spatial continuity, not decoration.
  const [back, setBack] = React.useState(false)
  const [jar, setJar] = React.useState("")
  const [label, setLabel] = React.useState(defaultLabel ?? "")
  const [fileName, setFileName] = React.useState<string | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const name = providerLabel(providerId)

  // Cleared on close so a jar cannot survive into the next open.
  React.useEffect(() => {
    if (open) return
    setStep(0)
    setBack(false)
    setJar("")
    setLabel(defaultLabel ?? "")
    setFileName(null)
  }, [open, defaultLabel])

  if (!provider) return null

  const active = CONNECT_STEPS[step]
  const last = step === CONNECT_STEPS.length - 1

  function goTo(next: number) {
    setBack(next < step)
    setStep(next)
  }

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
        replaces,
      },
      {
        onSuccess: (result) => {
          toast.add({
            type: "success",
            title: `${name} session ${replaces ? "replaced" : "connected"}`,
            description:
              result.discarded > 0
                ? `Kept ${result.kept} ${name} cookies and discarded ${result.discarded} belonging to other sites.`
                : `Kept ${result.kept} cookies.`,
          })
          onOpenChange(false)
        },
        onError: (error) => {
          // The server's 422 messages are written for the user and name the
          // fix, so they are surfaced as-is.
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
      {/*
        TWO measured fixes, both invisible to typecheck and lint.

        `sm:` prefix is load-bearing. DialogContent's base class ends in
        `sm:max-w-sm`, and an unprefixed `max-w-3xl` lands in a different
        tailwind-merge group, so both survive and the responsive one wins
        above 640px. The dialog rendered at ~385px with the step content
        spilling out of its own panel.

        `max-h-[90svh]` with a scrolling body, because the tallest step is
        848px and an iPhone SE viewport is 667. Measured: without it the
        dialog centred at top:-90 / bottom:757, clipping the header off the
        top AND putting Next below the fold with nothing to scroll — the
        wizard was unfinishable on a small phone. `svh`, not `vh`, so the
        mobile address bar cannot re-clip it.
      */}
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90svh] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {replaces ? "Reconnect" : "Connect"} {name}
          </DialogTitle>
          <DialogDescription>
            {replaces
              ? "Export a fresh session and it will replace the one stored now. Relay never sees your password."
              : "Export your session from a browser you are already signed in to. Relay never sees your password."}
          </DialogDescription>
        </DialogHeader>

        {/*
          `min-w-0` on BOTH this grid child and the flex column inside it.
          DialogContent is a grid, and a grid item defaults to
          `min-width: auto`, so the long export URL widened the whole column
          and every sibling with it — the header description overflowed the
          panel too, which is what gave the cause away.
        */}
        <div className="flex min-h-0 min-w-0 flex-col gap-6 sm:flex-row sm:gap-8">
          <ConnectRail steps={CONNECT_STEPS} current={step} onSelect={goTo} />

          {/*
            `min-w-0` is load-bearing, not tidiness. A flex child defaults to
            `min-width: auto`, so the long export URL and the warning copy
            pushed this column WIDER than the dialog and overflowed its right
            edge at 390px. Measured before adding it.
          */}
          <ScrollArea className="min-h-0 min-w-0 flex-1 sm:min-h-[19rem]">
            {/*
              Keyed on the step id so React remounts on change, which is what
              re-fires the entrance animation. `motion-safe:` gates it, and
              the direction follows the user's travel.
            */}
            <div
              key={active.id}
              // `pe-3` keeps body text clear of the ScrollArea scrollbar,
              // which otherwise overlays the last word of a wrapped line
              // once the step is tall enough to scroll.
              className={`pe-3 motion-safe:fade-in motion-safe:animate-in motion-safe:duration-300 motion-safe:ease-out ${
                back
                  ? "motion-safe:slide-in-from-left-4"
                  : "motion-safe:slide-in-from-right-4"
              }`}
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white">
                  <HugeiconsIcon icon={active.icon} size={18} strokeWidth={2} />
                </span>
                <h3 className="font-medium text-base">{active.title}</h3>
              </div>

              <ConnectStepBody provider={provider} step={active.id} />

              {last ? (
                <form
                  id="import-session"
                  onSubmit={submit}
                  className="mt-4 space-y-4"
                >
                  {/*
                    A hidden native file input driven by a real Button.
                    RULES.md bans native controls in the UI, and this one
                    renders nothing — the browser exposes no other way to
                    open a file picker.
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
                      <HugeiconsIcon
                        icon={File01Icon}
                        size={16}
                        strokeWidth={2}
                      />
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
                      onChange={(event) => setJar(event.target.value)}
                      rows={4}
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
                </form>
              ) : null}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => (step === 0 ? onOpenChange(false) : goTo(step - 1))}
          >
            {step === 0 ? (
              "Cancel"
            ) : (
              <>
                <HugeiconsIcon
                  icon={ArrowLeft02Icon}
                  size={16}
                  strokeWidth={2}
                />
                Back
              </>
            )}
          </Button>
          {last ? (
            <Button
              type="submit"
              form="import-session"
              disabled={!jar.trim() || importCookies.isPending}
              className="transition-transform active:scale-[0.98]"
            >
              {importCookies.isPending ? <Spinner /> : null}
              {replaces ? "Reconnect" : "Connect"} {name}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => goTo(step + 1)}
              className="transition-transform active:scale-[0.98]"
            >
              Next
              <HugeiconsIcon
                icon={ArrowRight02Icon}
                size={16}
                strokeWidth={2}
              />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

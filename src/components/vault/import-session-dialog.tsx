"use client"

import { ArrowLeft02Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { Modal } from "@/components/modal"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { ConnectRail } from "@/components/vault/connect-rail"
import {
  CONNECT_STEPS,
  ConnectStepBody,
} from "@/components/vault/cookie-import-steps"
import {
  IMPORT_FORM_ID,
  ImportUploadForm,
} from "@/components/vault/import-upload-form"
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
  const name = providerLabel(providerId)

  // Cleared on close so a jar cannot survive into the next open.
  React.useEffect(() => {
    if (open) return
    setStep(0)
    setBack(false)
    setJar("")
    setLabel(defaultLabel ?? "")
  }, [open, defaultLabel])

  if (!provider) return null

  const active = CONNECT_STEPS[step]
  const last = step === CONNECT_STEPS.length - 1

  function goTo(next: number) {
    setBack(next < step)
    setStep(next)
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

  const footer = (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => (step === 0 ? onOpenChange(false) : goTo(step - 1))}
      >
        {step === 0 ? (
          "Cancel"
        ) : (
          <>
            <HugeiconsIcon icon={ArrowLeft02Icon} size={16} strokeWidth={2} />
            Back
          </>
        )}
      </Button>
      {last ? (
        <Button
          type="submit"
          form={IMPORT_FORM_ID}
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
          <HugeiconsIcon icon={ArrowRight02Icon} size={16} strokeWidth={2} />
        </Button>
      )}
    </>
  )

  return (
    /*
      The app's shared modal shell, not a hand-rolled DialogContent. It
      already owns the scroll contract this wizard needs — a three-row grid
      capped at the viewport with the body as the only scroller — which is
      the same problem the tallest step (848px against an iPhone SE's 667)
      used to hit here with a bespoke `grid-rows`/`max-h-[90svh]` pair.
      The header icon tracks the active step, so the step's identity is
      stated once instead of twice.
    */
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`${replaces ? "Reconnect" : "Connect"} ${name}`}
      subtitle={
        replaces
          ? "Export a fresh session and it will replace the one stored now. Relay never sees your password."
          : "Export your session from a browser you are already signed in to. Relay never sees your password."
      }
      icon={active.icon}
      accent="violet"
      // `lg`, not `xl`. The steps are prose and one control apiece, and at
      // `xl` the measure ran past comfortable reading width on a desktop
      // while leaving no margin at all on a tablet. 42rem still fits the
      // rail and the step side by side in landscape.
      size="lg"
      footer={footer}
    >
      {/*
        `landscape:sm:`, not `sm:`. Width alone is the wrong test for "is
        there room for two columns": a portrait tablet is 768px across, past
        `sm`, but it is shaped like a phone and the rail steals the width the
        step content needs. Orientation decides — portrait stacks at any
        width, landscape splits once it is wide enough. A landscape phone
        splits too, and should: there the scarce axis is height, not width.

        `min-w-0` on the flex column is load-bearing, not tidiness. A flex
        child defaults to `min-width: auto`, so the long export URL and the
        warning copy pushed it WIDER than the modal and overflowed the right
        edge at 390px. Measured before adding it.
      */}
      <div className="flex min-w-0 flex-col gap-6 landscape:sm:flex-row landscape:sm:gap-8">
        {/* Sticky rather than in its own scroller: the modal body is the one
            designated scroll area (RULES.md), so nesting a second one here
            would be the raw-overflow pattern in disguise. Sticky keeps the
            progress visible through a long step without one. */}
        <div className="landscape:sm:sticky landscape:sm:top-0 landscape:sm:self-start">
          <ConnectRail steps={CONNECT_STEPS} current={step} onSelect={goTo} />
        </div>

        {/*
          Keyed on the step id so React remounts on change, which is what
          re-fires the entrance animation. `motion-safe:` gates it, and the
          direction follows the user's travel.
        */}
        <div
          key={active.id}
          className={`min-w-0 flex-1 motion-safe:fade-in motion-safe:animate-in motion-safe:duration-300 motion-safe:ease-out ${
            back
              ? "motion-safe:slide-in-from-left-4"
              : "motion-safe:slide-in-from-right-4"
          }`}
        >
          <h3 className="mb-4 font-medium text-base">{active.title}</h3>

          <ConnectStepBody provider={provider} step={active.id} />

          {last ? (
            <ImportUploadForm
              providerName={name}
              jar={jar}
              onJarChange={setJar}
              label={label}
              onLabelChange={setLabel}
              onSubmit={submit}
            />
          ) : null}
        </div>
      </div>
    </Modal>
  )
}

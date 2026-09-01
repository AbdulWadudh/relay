"use client"

import { Alert02Icon, UserSharingIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { SessionCanvas } from "@/components/vault/session-canvas"
import config from "@/config"
import { providerLabel } from "@/lib/providers"
import {
  cancelCapture,
  type StartedCapture,
  useFinishCapture,
  useStartCapture,
} from "@/lib/query/capture"

/**
 * Drives one sign-in: start a session, stream the browser, store the jar.
 *
 * The disclosure below the canvas is deliberate and not boilerplate. The
 * user's password really does travel through this server on its way to the
 * provider's login form — Relay never stores it, but "never stored" and
 * "never seen" are different claims and the honest one is stated here
 * (SESSION_AUTH.md §6, risk 3).
 */

type Phase = "starting" | "signing-in" | "ready" | "saving"

export function ConnectSessionDialog({
  provider,
  open,
  onOpenChange,
}: {
  provider: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const start = useStartCapture()
  // Stable across renders in TanStack Query, so it is a safe dependency.
  const startCapture = start.mutate
  const finish = useFinishCapture()
  const [session, setSession] = React.useState<StartedCapture | null>(null)
  const [phase, setPhase] = React.useState<Phase>("starting")
  const [account, setAccount] = React.useState<Record<string, unknown>>({})
  const label = providerLabel(provider)

  // Held in refs so the effect below depends only on what should actually
  // restart it. Re-running on a changed callback identity would tear down a
  // live browser mid-login.
  const sessionRef = React.useRef<StartedCapture | null>(null)
  sessionRef.current = session
  const closeRef = React.useRef(onOpenChange)
  closeRef.current = onOpenChange

  React.useEffect(() => {
    if (!open) return
    setPhase("starting")
    setSession(null)
    startCapture(provider, {
      onSuccess: (started) => {
        setSession(started)
        setPhase("signing-in")
      },
      onError: (error) => {
        toast.add({
          type: "error",
          title: "Could not open the sign-in window",
          description: error instanceof Error ? error.message : undefined,
        })
        closeRef.current(false)
      },
    })
    // Closing the dialog must free the slot immediately — waiting for the
    // idle timeout would hold ~400MB and block the next user for 90s.
    return () => {
      const live = sessionRef.current
      if (live) void cancelCapture(provider, live.sessionId)
    }
  }, [open, provider, startCapture])

  const save = () => {
    if (!session) return
    setPhase("saving")
    finish.mutate(
      { provider, sessionId: session.sessionId },
      {
        onSuccess: () => {
          toast.add({ type: "success", title: `${label} connected` })
          setSession(null)
          onOpenChange(false)
        },
        onError: () => {
          setPhase("ready")
          toast.add({ type: "error", title: "Could not save the session" })
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Sign in to {label}
            {phase === "starting" || phase === "saving" ? (
              <Spinner className="size-4" />
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {phase === "ready"
              ? "You're signed in. Save the session to finish."
              : `Sign in exactly as you normally would — this is ${label}'s own page.`}
          </DialogDescription>
        </DialogHeader>

        {session ? (
          <SessionCanvas
            wsUrl={session.wsUrl}
            ticket={session.ticket}
            width={config.capture.viewport.width}
            height={config.capture.viewport.height}
            onReady={(acct) => {
              setAccount(acct)
              setPhase("ready")
            }}
            onClosed={(reason) => {
              toast.add({ type: "error", title: reason })
              onOpenChange(false)
            }}
          />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-muted">
            <Spinner className="size-5" />
          </div>
        )}

        <div className="flex items-start gap-3 rounded-lg border border-amber-600 p-3">
          <HugeiconsIcon
            icon={Alert02Icon}
            strokeWidth={1.5}
            className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400"
          />
          <p className="text-muted-foreground text-xs leading-relaxed">
            You are typing into a browser running on this server, so your
            password passes through it on the way to {label}.{" "}
            <strong className="text-foreground">
              Relay never stores your password
            </strong>{" "}
            — only the session cookie, encrypted. Disconnecting here does not
            sign you out on {label}.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            {phase === "ready" && typeof account.account_id === "string"
              ? `Signed in as account ${account.account_id}`
              : phase === "signing-in"
                ? "Waiting for you to finish signing in…"
                : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={phase !== "ready"}
              className="gap-2"
            >
              <HugeiconsIcon icon={UserSharingIcon} className="size-4" />
              Save session
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

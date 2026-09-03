"use client"

import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Login03Icon,
  Queue01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth-client"
import { useCreateRun } from "@/lib/query/runs"
import { relayProcessSchema } from "@/lib/schemas"

import {
  clearPendingShare,
  readPendingShare,
  writePendingShare,
} from "./pending-share"
import { resolveShare, type ShareResolution } from "./resolve-share"
import { SharePanel } from "./share-panel"

// The refine's issue, not issues[0]: an empty url trips `.min(1)` first and
// that message is Zod's own "Too small: expected string to have >=1
// characters". The refine owns the supported-sources sentence.
function rejectionMessage(url: string): string {
  const parsed = relayProcessSchema.safeParse({ url })
  if (parsed.success) return ""
  const issues = parsed.error.issues
  return (
    issues.find((issue) => issue.code === "custom")?.message ??
    issues[0]?.message ??
    ""
  )
}

export function ShareTarget({ incoming }: { incoming: ShareResolution }) {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const createRun = useCreateRun()

  const [resolution, setResolution] = React.useState<ShareResolution>(incoming)
  const [adopted, setAdopted] = React.useState(incoming.kind !== "empty")

  React.useEffect(() => {
    if (incoming.kind === "ok") {
      // Stashed before auth is even known: the OS may kill us at any moment.
      writePendingShare(incoming.raw)
      setAdopted(true)
      return
    }
    if (incoming.kind === "unsupported") {
      setAdopted(true)
      return
    }
    const pending = readPendingShare()
    const revived = pending ? resolveShare({ url: pending }) : null
    if (revived?.kind === "ok") {
      setResolution(revived)
    } else if (pending) {
      clearPendingShare()
    }
    setAdopted(true)
  }, [incoming])

  const target = resolution.kind === "ok" ? resolution : null

  // Ref, not mutation state: React runs effects twice in dev and a share
  // must never queue two runs.
  const submitted = React.useRef(false)
  React.useEffect(() => {
    if (!adopted || !target || sessionPending || submitted.current) return
    if (!session) return
    submitted.current = true
    createRun.mutate(
      { url: target.source.canonicalUrl },
      { onSuccess: () => clearPendingShare() },
    )
  }, [adopted, target, session, sessionPending, createRun])

  if (!adopted || (target && sessionPending)) {
    return (
      <SharePanel
        tone="neutral"
        icon={Queue01Icon}
        title="Opening Relay"
        description="Checking the link you shared."
        sharedUrl={target?.raw}
        source={target?.source.source}
      />
    )
  }

  if (!target) {
    const raw = resolution.kind === "unsupported" ? resolution.raw : undefined
    return (
      <SharePanel
        tone="warning"
        icon={Alert02Icon}
        title={raw ? "Relay can't process that link" : "Nothing was shared"}
        description={rejectionMessage(raw ?? "")}
        sharedUrl={raw}
      >
        <Button
          nativeButton={false}
          render={<Link href="/runs" />}
          className="transition-all duration-200 hover:-translate-y-px"
        >
          Open Relay
        </Button>
      </SharePanel>
    )
  }

  if (!session) {
    return (
      <SharePanel
        tone="neutral"
        icon={Login03Icon}
        title="Sign in to queue this"
        description={`Your ${target.source.label} is saved. Sign in and Relay will pick it up.`}
        sharedUrl={target.raw}
        source={target.source.source}
      >
        <Button
          nativeButton={false}
          render={<Link href="/login" />}
          className="transition-all duration-200 hover:-translate-y-px hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600"
        >
          <HugeiconsIcon icon={Login03Icon} data-icon="inline-start" />
          Sign in
        </Button>
      </SharePanel>
    )
  }

  if (createRun.isSuccess) {
    return (
      <SharePanel
        tone="success"
        icon={CheckmarkCircle02Icon}
        title="Run queued"
        description={`Relay is processing your ${target.source.label}. You can close this and come back to it.`}
        sharedUrl={target.source.canonicalUrl}
        source={target.source.source}
      >
        <Button
          nativeButton={false}
          render={<Link href={`/runs/${createRun.data.id}`} />}
          className="transition-all duration-200 hover:-translate-y-px"
        >
          View run
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/runs" />}
          className="transition-all duration-200 hover:-translate-y-px"
        >
          All runs
        </Button>
      </SharePanel>
    )
  }

  if (createRun.isError) {
    return (
      <SharePanel
        tone="warning"
        icon={Alert02Icon}
        title="Couldn't queue that run"
        description={
          createRun.error instanceof Error
            ? createRun.error.message
            : "Could not queue the run."
        }
        sharedUrl={target.raw}
        source={target.source.source}
      >
        <Button
          onClick={() =>
            createRun.mutate(
              { url: target.source.canonicalUrl },
              { onSuccess: () => clearPendingShare() },
            )
          }
          className="transition-all duration-200 hover:-translate-y-px"
        >
          <HugeiconsIcon icon={RefreshIcon} data-icon="inline-start" />
          Try again
        </Button>
      </SharePanel>
    )
  }

  return (
    <SharePanel
      tone="progress"
      icon={Queue01Icon}
      title="Queueing your run"
      description={`Sending this ${target.source.label} to the pipeline.`}
      sharedUrl={target.raw}
      source={target.source.source}
    >
      <Button disabled className="pointer-events-none">
        <Spinner />
        Queueing
      </Button>
    </SharePanel>
  )
}

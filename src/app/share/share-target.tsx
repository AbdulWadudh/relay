"use client"

import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Login03Icon,
  PlayIcon,
  Queue01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import * as React from "react"

import { ModePicker } from "@/components/queue/analysis-mode-picker"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import config from "@/config"
import { authClient } from "@/lib/auth-client"
import type { AnalysisMode } from "@/lib/db/schema"
import { useCreateRun } from "@/lib/query/runs"
import type { ExistingRun } from "./existing-run"
import {
  clearPendingShare,
  readPendingShare,
  writePendingShare,
} from "./pending-share"
import { resolveShare, type ShareResolution } from "./resolve-share"
import { ShareExisting } from "./share-existing"
import { SharePanel } from "./share-panel"
import { ShareRejected } from "./share-rejected"

export function ShareTarget({
  incoming,
  autoRun,
  existing,
}: {
  incoming: ShareResolution
  /** `share_auto_run` for this user; false shows a Run button instead. */
  autoRun: boolean
  /** This user's newest run for the same canonical URL, if any. */
  existing: ExistingRun | null
}) {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const createRun = useCreateRun()
  const [mode, setMode] = React.useState<AnalysisMode>("auto")
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
  const queue = React.useCallback(() => {
    if (!target) return
    submitted.current = true
    createRun.mutate(
      { url: target.source.canonicalUrl, analysisMode: mode },
      { onSuccess: () => clearPendingShare() },
    )
  }, [target, createRun, mode])

  // `existing` is what stops navigating BACK to this page from queueing a
  // second run: the row is there the moment the first POST returns, so a
  // re-render finds it and offers a choice instead of firing again.
  const [runAgain, setRunAgain] = React.useState(false)
  const blocked = existing !== null && !runAgain

  React.useEffect(() => {
    if (!autoRun || !adopted || !target || sessionPending || blocked) return
    if (!session || submitted.current) return
    queue()
  }, [autoRun, adopted, target, session, sessionPending, blocked, queue])

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
    return <ShareRejected resolution={resolution} />
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

  if (blocked && existing) {
    return (
      <ShareExisting
        existing={existing}
        label={target.source.label}
        sharedUrl={target.raw}
        source={target.source.source}
        onRunAgain={() => {
          setRunAgain(true)
          queue()
        }}
      />
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
          onClick={queue}
          className="transition-all duration-200 hover:-translate-y-px"
        >
          <HugeiconsIcon icon={RefreshIcon} data-icon="inline-start" />
          Try again
        </Button>
      </SharePanel>
    )
  }

  if (!autoRun && !createRun.isPending) {
    return (
      <SharePanel
        tone="neutral"
        icon={PlayIcon}
        title="Ready when you are"
        description={`Relay checked this ${target.source.label} and can process it. Turn on "Run shared links immediately" in Settings to skip this step.`}
        sharedUrl={target.raw}
        source={target.source.source}
        extra={<ModePicker value={mode} onChange={setMode} />}
      >
        <Button
          onClick={queue}
          className="transition-all duration-200 hover:-translate-y-px hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600"
        >
          <HugeiconsIcon icon={PlayIcon} data-icon="inline-start" />
          Run it
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={config.app.homePath} />}
          className="transition-all duration-200 hover:-translate-y-px"
        >
          Not now
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

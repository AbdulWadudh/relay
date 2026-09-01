"use client"

import { Alert02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { QueryErrorState } from "@/components/query-error"
import { Linkify } from "@/components/queue/linkify"
import { PublishedPanel } from "@/components/queue/published-panel"
import { RunDetailHeader } from "@/components/queue/run-detail-header"
import { RunDetailSkeleton } from "@/components/queue/run-detail-skeleton"
import { RunExtraction } from "@/components/queue/run-extraction"
import {
  type Fact,
  FactList,
  processingFacts,
  sourceFacts,
} from "@/components/queue/run-facts"
import { RunRawData } from "@/components/queue/run-raw-data"
import { RunStageTimeline } from "@/components/queue/run-stage-timeline"
import {
  RunTranscript,
  type TranscriptStream,
} from "@/components/queue/run-transcript"
import {
  readVerification,
  VerificationSummary,
} from "@/components/queue/verification-summary"
import { useRun } from "@/lib/query/runs"

const dateFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "medium",
})

function Section({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function RunDetail({ runId }: { runId: string }) {
  const { data: run, isPending, isError, error, refetch } = useRun(runId)

  if (isPending) return <RunDetailSkeleton />
  if (isError && !run) {
    return (
      <QueryErrorState entity="run" error={error} onRetry={() => refetch()} />
    )
  }
  if (!run) return null

  const extra = run.additionalData
  const info = (extra.source_info ?? {}) as Record<string, unknown>
  const transcript = extra.transcript as Record<string, unknown> | undefined
  const noSpeech = extra.no_speech as Record<string, unknown> | undefined
  const source = sourceFacts(info)
  const processing = processingFacts(extra)
  const routing = extra.routing as Record<string, unknown> | undefined
  const extraction = run.result?.extraction as
    | Record<string, unknown>
    | undefined
  const verification = readVerification(run.result)
  const published = run.result?.published as
    | { url?: string; provider?: string }
    | undefined
  const findings = (extra.verification ?? []) as Record<string, unknown>[]

  const description =
    typeof info.description === "string" && info.description.trim().length > 0
      ? info.description
      : null

  const timing: Fact[] = [
    { label: "Submitted", value: dateFormat.format(run.createdAt) },
    { label: "Last updated", value: dateFormat.format(run.updatedAt) },
  ]

  return (
    <div className="flex flex-col gap-8">
      <RunDetailHeader
        status={run.status}
        title={run.title ?? run.sourceLabel}
        sourceUrl={run.sourceUrl}
      />

      {run.error ? (
        <div className="flex gap-3 rounded-lg border border-red-600 p-4">
          <HugeiconsIcon
            icon={Alert02Icon}
            strokeWidth={1.5}
            className="mt-0.5 size-5 shrink-0 text-red-700 dark:text-red-400"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-medium text-red-700 text-sm dark:text-red-400">
              {run.error}
            </p>
            <p className="font-mono text-muted-foreground text-xs">
              {String(extra.error_code ?? "UNKNOWN")}
              {extra.permanent === true ? " · will not be retried" : ""}
            </p>
          </div>
        </div>
      ) : null}

      <Section title="Stages">
        <div className="rounded-lg border p-5">
          <RunStageTimeline
            status={run.status}
            timings={run.timings}
            failedStage={
              typeof extra.failed_stage === "string" ? extra.failed_stage : null
            }
          />
        </div>
      </Section>

      {published?.url ? (
        <Section title="Published">
          <PublishedPanel url={published.url} provider={published.provider} />
        </Section>
      ) : null}

      {verification ? (
        <Section title="Evidence">
          <VerificationSummary counts={verification} />
        </Section>
      ) : null}

      {extraction ? (
        <Section title="Extraction">
          <RunExtraction
            data={extraction}
            findings={findings}
            agentName={
              typeof routing?.agent_name === "string"
                ? routing.agent_name
                : null
            }
            routingReason={
              typeof routing?.reason === "string" ? routing.reason : null
            }
          />
        </Section>
      ) : null}

      {transcript ? (
        <Section title="Transcript">
          <RunTranscript
            roman={transcript.roman as TranscriptStream | undefined}
            english={transcript.english as TranscriptStream | undefined}
          />
        </Section>
      ) : null}

      {noSpeech ? (
        <Section title="Discarded output">
          <div className="rounded-lg border p-4">
            <p className="text-muted-foreground text-sm">
              The clip had no detectable speech. Whisper still returned text,
              which is fabricated and was discarded rather than published. It is
              kept here for auditing.
            </p>
            <p className="mt-3 rounded border bg-muted p-3 font-mono text-xs [overflow-wrap:anywhere]">
              <Linkify text={String(noSpeech.discarded_text ?? "")} />
            </p>
          </div>
        </Section>
      ) : null}

      {source.length > 0 || description ? (
        <Section title="Source">
          <div className="flex flex-col gap-4 rounded-lg border p-5">
            <FactList facts={source} />
            {description ? (
              <p className="whitespace-pre-wrap border-t pt-4 text-sm leading-relaxed [overflow-wrap:anywhere]">
                <Linkify text={description} />
              </p>
            ) : null}
          </div>
        </Section>
      ) : null}

      <Section title="Processing">
        <div className="flex flex-col gap-4 rounded-lg border p-5">
          <FactList facts={processing} />
          {/* Only divide when there is something above to divide from — a
              run that failed before transcription has no processing facts,
              and an unattached rule reads as a rendering bug. */}
          <div className={processing.length > 0 ? "border-t pt-4" : undefined}>
            <FactList facts={timing} />
          </div>
        </div>
      </Section>

      <Section title="Stored data">
        <div className="flex flex-col gap-2">
          <RunRawData title="additional_data" data={extra} />
          <RunRawData title="timings" data={run.timings} />
          {run.result ? <RunRawData title="result" data={run.result} /> : null}
        </div>
      </Section>
    </div>
  )
}

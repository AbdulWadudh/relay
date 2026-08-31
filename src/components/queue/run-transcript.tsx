import { Linkify } from "@/components/queue/linkify"
import { Badge } from "@/components/ui/badge"

/**
 * The two transcript streams (PRD §4.2), side by side on desktop and
 * stacked on mobile: the Roman/phonetic record of what was said, and the
 * millisecond-aligned English translation.
 *
 * They are shown separately rather than interleaved because the two
 * Whisper calls segment independently, so their segment boundaries do not
 * line up and pairing them row-for-row would imply an alignment that does
 * not exist.
 */

export interface Segment {
  startMs: number
  endMs: number
  text: string
}

export interface TranscriptStream {
  text?: string
  segments?: Segment[]
  transliterated?: boolean
  latinRatio?: number
}

/** mm:ss.mmm, monospaced so the column does not jitter between rows. */
function stamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0")
  const seconds = String(totalSeconds % 60).padStart(2, "0")
  const millis = String(ms % 1000).padStart(3, "0")
  return `${minutes}:${seconds}.${millis}`
}

function StreamPanel({
  title,
  note,
  stream,
}: {
  title: string
  note?: React.ReactNode
  stream: TranscriptStream | undefined
}) {
  const segments = stream?.segments ?? []

  return (
    <section className="flex min-w-0 flex-col rounded-lg border">
      <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <h3 className="font-medium text-sm">{title}</h3>
        {note}
      </header>

      {stream?.text ? (
        <>
          <p className="border-b px-4 py-3 text-sm leading-relaxed [overflow-wrap:anywhere]">
            <Linkify text={stream.text} />
          </p>
          <ol className="divide-y">
            {segments.map((segment) => (
              <li
                key={`${segment.startMs}-${segment.endMs}`}
                className="flex gap-3 px-4 py-2.5"
              >
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                  {stamp(segment.startMs)}
                </span>
                <span className="min-w-0 text-sm [overflow-wrap:anywhere]">
                  {segment.text}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="px-4 py-6 text-muted-foreground text-sm">
          Nothing was transcribed for this run.
        </p>
      )}
    </section>
  )
}

export function RunTranscript({
  roman,
  english,
}: {
  roman: TranscriptStream | undefined
  english: TranscriptStream | undefined
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <StreamPanel
        title="Spoken (Roman)"
        note={
          roman?.transliterated ? (
            <Badge className="border-transparent bg-indigo-600 text-white dark:bg-indigo-600">
              Transliterated
            </Badge>
          ) : (
            <Badge variant="outline">As transcribed</Badge>
          )
        }
        stream={roman}
      />
      <StreamPanel title="English translation" stream={english} />
    </div>
  )
}

/**
 * Key/value facts pulled out of the run's `additional_data`: what the
 * source was, and what the pipeline used to process it.
 *
 * Only fields worth reading at a glance are lifted here. Everything else
 * stays available verbatim in the raw-data panel, so nothing the run
 * captured is hidden, but the page is not a wall of JSON either.
 */

export interface Fact {
  label: string
  value: React.ReactNode
}

export function FactList({ facts }: { facts: Fact[] }) {
  if (facts.length === 0) return null
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {facts.map((fact) => (
        <div key={fact.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-muted-foreground text-xs">{fact.label}</dt>
          <dd className="min-w-0 text-sm [overflow-wrap:anywhere]">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

const numberFormat = new Intl.NumberFormat("en")

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value
  if (typeof value === "number") return numberFormat.format(value)
  return null
}

/** yt-dlp reports upload_date as YYYYMMDD. */
function uploadDate(value: unknown): string | null {
  const raw = typeof value === "string" ? value : null
  if (!raw || !/^\d{8}$/.test(raw)) return null
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

function seconds(value: unknown): string | null {
  if (typeof value !== "number") return null
  const minutes = Math.floor(value / 60)
  const rest = Math.round(value % 60)
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`
}

export function sourceFacts(info: Record<string, unknown>): Fact[] {
  const candidates: [string, string | null][] = [
    ["Channel", text(info.channel) ?? text(info.uploader)],
    ["Duration", seconds(info.duration)],
    ["Views", text(info.view_count)],
    ["Likes", text(info.like_count)],
    ["Uploaded", uploadDate(info.upload_date)],
    ["Language", text(info.language)],
  ]
  return candidates
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([label, value]) => ({ label, value }))
}

export function processingFacts(
  additionalData: Record<string, unknown>,
): Fact[] {
  const transcript = additionalData.transcript as
    | Record<string, unknown>
    | undefined
  const speech = transcript?.speech as Record<string, unknown> | undefined
  const binaries = additionalData.binaries as Record<string, string> | undefined
  const bytes = additionalData.audio_bytes

  const candidates: [string, string | null][] = [
    ["Transcription provider", text(transcript?.provider)],
    ["Audio model", text(transcript?.audio_model)],
    ["Detected language", text(transcript?.language)],
    [
      "Speech confidence",
      typeof speech?.meanNoSpeechProb === "number"
        ? `${(1 - speech.meanNoSpeechProb).toFixed(3)} (no-speech ${speech.meanNoSpeechProb.toFixed(3)})`
        : null,
    ],
    [
      "Extracted audio",
      typeof bytes === "number" ? `${Math.round(bytes / 1024)} KB` : null,
    ],
    ["yt-dlp", binaries?.["yt-dlp"] ?? null],
    ["ffmpeg", binaries?.ffmpeg ?? null],
  ]
  return candidates
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([label, value]) => ({
      label,
      value: <span className="font-mono text-xs tabular-nums">{value}</span>,
    }))
}

/**
 * Ingest failure vocabulary, shared by the download and extraction steps
 * so neither has to import the other (src/lib/media/ingest.ts orchestrates
 * both and re-exports these for callers).
 */

export type IngestErrorCode =
  | "SOURCE_UNSUPPORTED"
  | "SOURCE_UNAVAILABLE"
  | "DOWNLOAD_FAILED"
  | "EXTRACT_FAILED"

export class MediaIngestError extends Error {
  readonly code: IngestErrorCode

  constructor(code: IngestErrorCode, message: string) {
    super(message)
    this.name = "MediaIngestError"
    this.code = code
  }
}

/**
 * Both tools print progress before failing, and put the actual reason on
 * the LAST line ("ERROR: ..." for yt-dlp), so that's the line worth
 * surfacing. Capped so a pathological stderr can't blow up a run's stored
 * error column.
 */
export function lastLine(output: string): string {
  const lines = output.trim().split("\n").filter(Boolean)
  return lines[lines.length - 1]?.trim().slice(0, 400) ?? ""
}

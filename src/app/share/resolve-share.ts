import { type ParsedSource, parseSourceUrl } from "@/lib/media/sources"

export interface SharePayload {
  url?: string
  text?: string
  title?: string
}

export type ShareResolution =
  | { kind: "ok"; source: ParsedSource; raw: string }
  | { kind: "unsupported"; raw: string }
  | { kind: "empty" }

const URL_IN_TEXT = /https?:\/\/[^\s<>"'`]+/gi

// `/` excluded — an Instagram Reel URL genuinely ends in one.
const TRAILING_PROSE = /[.,;:!?)\]}>'"]+$/

// Every field is swept, not just `url`: Android share sheets routinely leave
// it empty and put the link in `text`, wrapped in the app's own words.
function candidates(payload: SharePayload): string[] {
  const found: string[] = []
  for (const field of [payload.url, payload.text, payload.title]) {
    if (!field) continue
    for (const match of field.match(URL_IN_TEXT) ?? []) {
      const cleaned = match.replace(TRAILING_PROSE, "")
      if (cleaned.length > 0) found.push(cleaned)
    }
  }
  return found
}

// First SUPPORTED link wins, not first link: "Look at this <tracker> <reel>".
export function resolveShare(payload: SharePayload): ShareResolution {
  const found = candidates(payload)
  for (const raw of found) {
    const source = parseSourceUrl(raw)
    if (source) return { kind: "ok", source, raw }
  }
  const first = found[0]
  return first ? { kind: "unsupported", raw: first } : { kind: "empty" }
}

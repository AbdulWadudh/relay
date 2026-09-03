// localStorage, not sessionStorage: Google sign-in leaves the origin and can
// come back in a different tab context.
const KEY = "relay:pending-share"

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

interface StoredShare {
  url: string
  at: number
}

// Every access is guarded: localStorage throws outright when storage is
// disabled, and this runs on the one screen that must not blank out.
export function writePendingShare(url: string): void {
  try {
    const value: StoredShare = { url, at: Date.now() }
    window.localStorage.setItem(KEY, JSON.stringify(value))
  } catch {}
}

export function clearPendingShare(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {}
}

export function readPendingShare(): string | null {
  let raw: string | null
  try {
    raw = window.localStorage.getItem(KEY)
  } catch {
    return null
  }
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<StoredShare>
    if (typeof parsed.url !== "string" || typeof parsed.at !== "number") {
      clearPendingShare()
      return null
    }
    if (Date.now() - parsed.at > MAX_AGE_MS) {
      clearPendingShare()
      return null
    }
    return parsed.url
  } catch {
    clearPendingShare()
    return null
  }
}

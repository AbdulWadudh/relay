import { mkdir, rm } from "node:fs/promises"
import { resolve } from "node:path"

import config from "@/config"

/**
 * Launches the headful browser a user drives to sign in (SESSION_AUTH.md §2).
 *
 * SECURITY, in order of importance:
 *
 * 1. THE CDP PORT IS UNAUTHENTICATED. Anything that can reach it has total
 *    control of the browser — read any cookie, script any page. It is bound
 *    to loopback on an EPHEMERAL port (`--remote-debugging-port=0`), the
 *    port is never published, and the URL is never logged or returned by an
 *    API. This is the single most dangerous surface in the feature.
 * 2. THE SANDBOX STAYS ON by default. This browser renders third-party
 *    pages, so `--no-sandbox` would put a renderer exploit directly on the
 *    host. Containers often disable it for convenience; `CAPTURE_NO_SANDBOX`
 *    exists as an escape hatch and is documented as a downgrade.
 * 3. A THROWAWAY PROFILE PER SESSION, deleted on dispose and never reused.
 *    Required, not tidy: yt-dlp's own guidance is that reopening an exported
 *    YouTube session rotates its refresh token and invalidates the cookies
 *    we just captured (SESSION_AUTH.md §4.2b).
 *
 * Headful is deliberate — Instagram fingerprints `--headless=new`. Xvfb
 * supplies the display on Linux; a dev machine with a real display skips it.
 */

export interface LaunchedBrowser {
  /** ws://127.0.0.1:<ephemeral>/devtools/browser/... — NEVER log this. */
  webSocketUrl: string
  /** Kills the process tree and removes the profile. Safe to call twice. */
  dispose: () => Promise<void>
}

/** Chrome prints this to stderr once the port is bound. */
const DEVTOOLS_LINE = /^DevTools listening on (ws:\/\/\S+)$/m

/** A browser that never prints its endpoint is broken; do not hang on it. */
const LAUNCH_TIMEOUT_MS = 30_000

function browserArgs(profileDir: string): string[] {
  const { width, height } = config.capture.viewport
  return [
    // Ephemeral port, loopback only. Never published.
    "--remote-debugging-port=0",
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${profileDir}`,
    `--window-size=${width},${height}`,
    // Quieter and cheaper: none of this is wanted for a single sign-in, and
    // each one is background CPU, network and disk we would be paying for.
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-background-timer-throttling",
    "--disable-breakpad",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-sync",
    "--metrics-recording-only",
    "--mute-audio",
    // Chromium's default /dev/shm is 64MB in Docker and tab crashes follow.
    // Preferred fix is shm_size on the service; this is the fallback for
    // hosts where that cannot be set.
    ...(config.capture.smallShm ? ["--disable-dev-shm-usage"] : []),
    ...(config.capture.noSandbox ? ["--no-sandbox"] : []),
    "about:blank",
  ]
}

export async function launchBrowser(
  sessionId: string,
): Promise<LaunchedBrowser> {
  /**
   * ABSOLUTE, and created before launch.
   *
   * Chrome resolves a relative `--user-data-dir` against ITS OWN working
   * directory, not ours. Observed: a relative path made Chrome pop a
   * "cannot read and write to its data directory" dialog on the host's
   * screen and fall back to another profile. That fallback is the real
   * danger — the capture browser must never reach the operator's own Chrome
   * profile, or a harvest could scrape their personal cookies.
   */
  const profileDir = resolve(config.media.tempDir, `capture-${sessionId}`)
  await mkdir(profileDir, { recursive: true })
  const { width, height } = config.capture.viewport

  const command = config.capture.useXvfb
    ? [
        config.capture.xvfbRunPath,
        // -a picks a free display number; without it two concurrent
        // sessions collide on :99 and the second dies.
        "-a",
        "--server-args",
        `-screen 0 ${width}x${height}x24`,
        config.capture.chromiumPath,
        ...browserArgs(profileDir),
      ]
    : [config.capture.chromiumPath, ...browserArgs(profileDir)]

  const child = Bun.spawn(command, {
    stdout: "ignore",
    stderr: "pipe",
    // Do not leak the parent's environment (vault key, database token) into
    // a process that renders third-party pages.
    env: { PATH: process.env.PATH ?? "", HOME: profileDir },
  })

  let disposed = false
  const dispose = async () => {
    if (disposed) return
    disposed = true
    try {
      child.kill()
      await child.exited
    } catch {
      // Already gone.
    }
    // The profile holds the live session cookies. It must not outlive the
    // capture, so removal is unconditional and failure is swallowed rather
    // than allowed to mask the caller's own outcome.
    await rm(profileDir, { recursive: true, force: true }).catch(() => {})
  }

  try {
    const webSocketUrl = await readEndpoint(child.stderr)
    return { webSocketUrl, dispose }
  } catch (error) {
    await dispose()
    throw error
  }
}

/**
 * Reads the DevTools endpoint off stderr. Chrome writes it once, at start,
 * and keeps the stream open — so this resolves on the matching line rather
 * than waiting for the stream to end.
 */
async function readEndpoint(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const decoder = new TextDecoder()
  const reader = stream.getReader()
  let buffer = ""
  const deadline = Date.now() + LAUNCH_TIMEOUT_MS

  try {
    while (Date.now() < deadline) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const match = DEVTOOLS_LINE.exec(buffer)
      if (match?.[1]) return match[1]
      // Chrome is chatty on stderr; keep only enough to match across a
      // chunk boundary so a long session cannot grow this unbounded.
      if (buffer.length > 8192) buffer = buffer.slice(-2048)
    }
  } finally {
    reader.releaseLock()
  }
  throw new Error("Browser did not report a DevTools endpoint")
}

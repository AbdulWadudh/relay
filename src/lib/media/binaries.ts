import { $ } from "bun"

import config from "@/config"

/**
 * Host binary preflight (TRD §1, Task 4.1).
 *
 * The pipeline shells out to `yt-dlp` and `ffmpeg`. A missing binary
 * surfaces from Bun's shell as an opaque exit-127 ShellError, which tells
 * an operator nothing, so every run checks first and fails with the
 * install command and the env var that overrides the path.
 */

export class MediaBinaryError extends Error {
  readonly code = "MEDIA_BINARY_MISSING"
  readonly binary: string

  constructor(binary: string, message: string) {
    super(message)
    this.name = "MediaBinaryError"
    this.binary = binary
  }
}

interface BinarySpec {
  /** Name used in errors and in the run's recorded binary versions. */
  name: string
  /** Configured path or bare command (src/config media section). */
  command: string
  /**
   * Version flag. NOT uniform: yt-dlp takes `--version`, ffmpeg only
   * accepts the single-dash `-version` and exits 8 on `--version` after
   * printing its banner — which read as "binary broken" until this was
   * split per-binary.
   */
  versionArg: string
  /** Env var an operator sets to point at an absolute path. */
  envVar: string
  /** Per-platform install hints, joined into the error message. */
  install: readonly string[]
  /**
   * Sources needing this binary. Absent means every source needs it.
   * A YouTube-only operator must not be blocked by a missing Instagram
   * downloader, so preflight checks only what this run will actually run.
   */
  sources?: readonly string[]
}

const BINARIES: readonly BinarySpec[] = [
  {
    name: "yt-dlp",
    command: config.media.ytDlpPath,
    versionArg: "--version",
    envVar: "YT_DLP_PATH",
    install: [
      "winget install yt-dlp.yt-dlp",
      "brew install yt-dlp",
      "pipx install yt-dlp",
    ],
  },
  {
    name: "instaloader",
    command: config.media.instaloaderPath,
    versionArg: "--version",
    envVar: "INSTALOADER_PATH",
    sources: ["instagram"],
    install: [
      "pipx install instaloader",
      "pip install instaloader",
      "brew install instaloader",
    ],
  },
  {
    name: "ffmpeg",
    command: config.media.ffmpegPath,
    versionArg: "-version",
    envVar: "FFMPEG_PATH",
    install: [
      "winget install Gyan.FFmpeg",
      "brew install ffmpeg",
      "apt install ffmpeg",
    ],
  },
]

export type BinaryVersions = Record<string, string>

// Only successful detections are cached. Caching a failure would keep a
// long-running server reporting "missing" after the operator installed it.
const detected = new Map<string, string>()

function missingMessage(spec: BinarySpec, detail: string): string {
  return [
    `${spec.name} is required to process media but ${detail} (tried "${spec.command}").`,
    `Install it — ${spec.install.join(", or ")} —`,
    `or set ${spec.envVar} to its absolute path and restart ${config.app.name}.`,
  ].join(" ")
}

/**
 * First line of the version output. yt-dlp prints a bare version; ffmpeg
 * prints a banner whose trailing " Copyright (c) ... developers" clause is
 * noise in a recorded toolchain version, so it's dropped.
 */
function firstLine(output: string): string {
  const line = output.trim().split("\n")[0]?.trim() ?? ""
  return line.split(" Copyright ")[0]?.trim().slice(0, 200) || "unknown"
}

async function detectBinary(spec: BinarySpec): Promise<string> {
  const cached = detected.get(spec.name)
  if (cached) return cached

  let result: { exitCode: number; stdout: Buffer; stderr: Buffer }
  try {
    result = await $`${spec.command} ${spec.versionArg}`.nothrow().quiet()
  } catch (error) {
    // Bun's shell throws rather than exiting non-zero when it can't even
    // spawn the process (e.g. the path exists but isn't executable).
    throw new MediaBinaryError(
      spec.name,
      missingMessage(
        spec,
        `it could not be run: ${error instanceof Error ? error.message : String(error)}`,
      ),
    )
  }

  if (result.exitCode !== 0) {
    const stderr = firstLine(result.stderr.toString())
    // Distinguish "not installed" from "installed but broken" — the two
    // need different things from the operator, and a bare exit code buries
    // that distinction.
    const notFound =
      /command not found|no such file|not recognized|ENOENT/i.test(stderr)
    throw new MediaBinaryError(
      spec.name,
      missingMessage(
        spec,
        notFound
          ? "it was not found"
          : stderr.length > 0
            ? `running it failed (exit ${result.exitCode}: ${stderr})`
            : `running it failed (exit ${result.exitCode})`,
      ),
    )
  }

  const version = firstLine(result.stdout.toString())
  detected.set(spec.name, version)
  return version
}

/**
 * Throws MediaBinaryError on the first missing binary. Resolves to the
 * detected versions, which the run stores in `additional_data` so a failed
 * extraction can be tied to the exact toolchain that produced it.
 */
export async function ensureMediaBinaries(
  sourceId?: string,
): Promise<BinaryVersions> {
  const versions: BinaryVersions = {}
  for (const spec of BINARIES) {
    if (spec.sources && sourceId && !spec.sources.includes(sourceId)) continue
    versions[spec.name] = await detectBinary(spec)
  }
  return versions
}

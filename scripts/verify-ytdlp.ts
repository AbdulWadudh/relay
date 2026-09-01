import { $ } from "bun"

import config from "@/config"

/**
 * Acceptance test for a yt-dlp version bump — `bun run verify:ytdlp`.
 *
 * WHY THIS EXISTS. `Dockerfile:78` pins `YT_DLP_VERSION` hard. That is
 * correct (a floating version means the extractor can change underneath a
 * deploy that only touched app code) but it has a cost: YouTube breaks
 * yt-dlp's extractors continuously, so a pin with no bump cadence is a
 * slow-motion outage. SESSION_AUTH.md risk #8.
 *
 * WHAT IT CHECKS. Not "does yt-dlp run" — that never fails informatively.
 * It reproduces the §1.1 measurement that produced the fallback chain in
 * the first place: for each fixture, try the DEFAULT client and then each
 * client in `config.media.ytDlpFallbacks`, and record which actually
 * delivered MEDIA. Metadata resolution is not enough; the GVS 403 of §1.1
 * happens after metadata resolves fine, which is exactly why a `--simulate`
 * check would have passed while every real run failed.
 *
 * THE BAR. Every fixture must be served by at least one configured client,
 * and the whole configured chain must not have gone dark. A bump that
 * leaves one fixture unreachable is a bump that will strand real runs.
 *
 * CADENCE. Run this against the pinned version and the candidate version
 * before changing `YT_DLP_VERSION`:
 *
 *   bun run verify:ytdlp                     # the version on PATH
 *   YT_DLP_PATH=/tmp/yt-dlp-new bun run verify:ytdlp
 *
 * yt-dlp itself warns once a build is over 90 days old, so treat that
 * warning as the trigger rather than waiting for a user to report a
 * failure.
 */

/**
 * The §1.1 sample, kept because it is not arbitrary: three of these six
 * FAILED on the default client chain when the fallbacks were introduced,
 * which is the whole reason the chain exists. A fixture set where nothing
 * ever failed would not detect a regression. Override to re-measure
 * against fresh items — the ids age out as videos are removed.
 */
const FIXTURES = (
  process.env.YT_DLP_FIXTURES ??
  [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=9bZkp7q19f0",
    "https://www.youtube.com/shorts/n5t23nvU_t0",
    "https://www.youtube.com/shorts/T-1iAFMZunY",
    "https://www.youtube.com/shorts/MGIovezvFSQ",
    "https://www.youtube.com/shorts/afZpm4LVjG0",
  ].join(",")
)
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean)

const DIR = `${config.media.tempDir.replace(/^\.\/+/, "")}/verify-ytdlp`

/** The chain the PRODUCT would try, in order: default first, then fallbacks. */
const CHAIN: (string | null)[] = [
  null,
  ...(config.media.ytDlpFallbacks.youtube ?? []),
]

function label(extractorArgs: string | null): string {
  return extractorArgs?.replace("youtube:player_client=", "") ?? "default"
}

/** One real media fetch. Returns bytes on success, or the failure reason. */
async function attempt(
  url: string,
  extractorArgs: string | null,
): Promise<{ ok: true; bytes: number } | { ok: false; reason: string }> {
  await $`rm -rf ${DIR}`.nothrow().quiet()
  await $`mkdir -p ${DIR}`.nothrow().quiet()

  const args = [
    "--no-playlist",
    "--no-warnings",
    "--no-progress",
    "-f",
    "bestaudio/best",
    "-o",
    `${DIR}/media.%(ext)s`,
    ...(extractorArgs ? ["--extractor-args", extractorArgs] : []),
    url,
  ]
  const result = await $`${config.media.ytDlpPath} ${args}`.nothrow().quiet()

  if (result.exitCode !== 0) {
    const stderr = result.stderr.toString().trim().split("\n").filter(Boolean)
    const last = stderr[stderr.length - 1]?.trim() ?? ""
    // 403 is the specific failure the fallback chain exists to route
    // around; naming it keeps a real regression distinguishable from a
    // video that simply went private between runs.
    const reason = /\b403\b|forbidden/i.test(last)
      ? "403"
      : last.replace(/^ERROR:\s*/, "").slice(0, 60)
    return { ok: false, reason: reason || `exit ${result.exitCode}` }
  }

  const listing = await $`ls -1 ${DIR}`.nothrow().quiet()
  const file = listing.stdout.toString().trim().split("\n").filter(Boolean)[0]
  if (!file) return { ok: false, reason: "exit 0 but no file" }
  return { ok: true, bytes: Bun.file(`${DIR}/${file}`).size }
}

async function main(): Promise<void> {
  const version = (await $`${config.media.ytDlpPath} --version`.nothrow().quiet())
    .stdout.toString()
    .trim()

  console.log(`yt-dlp ${version} (${config.media.ytDlpPath})`)
  console.log(`chain:  ${CHAIN.map(label).join(" -> ")}`)
  console.log(`Dockerfile pins YT_DLP_VERSION — bump it only if this passes.\n`)

  const unreachable: string[] = []
  /** Which clients served at least one fixture, for the dead-client check. */
  const served = new Map<string, number>()

  for (const url of FIXTURES) {
    const id = url.split(/[/=]/).pop() ?? url
    const cells: string[] = []
    let winner: string | null = null

    for (const extractorArgs of CHAIN) {
      const name = label(extractorArgs)
      const outcome = await attempt(url, extractorArgs)
      if (outcome.ok) {
        cells.push(`${name}=OK(${Math.round(outcome.bytes / 1024)}KB)`)
        served.set(name, (served.get(name) ?? 0) + 1)
        winner ??= name
        // The product stops at the first client that works, so stop here
        // too — anything further would not reflect a real run.
        break
      }
      cells.push(`${name}=${outcome.reason}`)
      // The product only falls through on a 403. Any other failure is the
      // item itself, so retrying it under three more clients is noise.
      if (outcome.reason !== "403") break
    }

    if (!winner) unreachable.push(id)
    console.log(
      `${winner ? "PASS" : "FAIL"}  ${id.padEnd(14)} ${cells.join("  ")}`,
    )
  }

  await $`rm -rf ${DIR}`.nothrow().quiet()

  const dead = CHAIN.map(label).filter((name) => !served.has(name))
  console.log("")
  if (dead.length > 0) {
    // Not fatal on its own: the default client serving everything means no
    // fixture ever reached a fallback, which is a good outcome.
    console.log(`note: never needed or never worked -> ${dead.join(", ")}`)
  }

  if (unreachable.length > 0) {
    console.log(
      `FAILED: ${unreachable.length}/${FIXTURES.length} unreachable by every configured client: ${unreachable.join(", ")}`,
    )
    console.log(
      "Do NOT bump the pin. Re-measure the client matrix and update YT_DLP_YOUTUBE_CLIENTS first.",
    )
    process.exit(1)
  }

  console.log(`PASSED: all ${FIXTURES.length} fixtures reachable.`)
}

await main()

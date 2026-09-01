import { $ } from "bun"

import config from "@/config"
import { lastLine, MediaIngestError } from "@/lib/media/errors"
import type { ParsedSource } from "@/lib/media/sources"

/**
 * The Instagram downloader.
 *
 * yt-dlp cannot fetch Reels anonymously — it returns "rate-limit reached
 * or login required" — while instaloader can, verified 2026-09-01 on the
 * exact Reel a run had already failed on. Every other source stays on
 * yt-dlp; this exists only because Instagram is gated differently.
 *
 * ANONYMOUS ACCESS IS NOT GUARANTEED TO LAST. Instagram rate-limits it,
 * and the deferred cookie-capture work is the fallback for when it starts
 * refusing — which is why the login-shaped failures below map onto the
 * same `SOURCE_UNAVAILABLE` code yt-dlp's do.
 */

const UNAVAILABLE =
  /login|log in|401|429|rate.?limit|not found|private|unavailable|does not exist|checkpoint|challenge/i

/**
 * instaloader's post JSON onto the same shape `pruneInfo` produces for
 * yt-dlp, so `source_info` has one meaning regardless of which tool ran
 * and the routing/UI layers need no per-source branches.
 */
function mapInfo(
  raw: Record<string, unknown>,
  shortcode: string,
): Record<string, unknown> {
  const node = (raw.node ?? raw) as Record<string, unknown>
  const owner = (node.owner ?? node.user ?? {}) as Record<string, unknown>
  const captionEdges = ((
    node.edge_media_to_caption as { edges?: { node?: { text?: string } }[] }
  )?.edges ?? [])[0]?.node?.text
  const caption =
    captionEdges ??
    (typeof node.caption === "string"
      ? node.caption
      : ((node.caption as { text?: string } | undefined)?.text ?? ""))

  const takenAt = node.taken_at_timestamp ?? node.taken_at
  const uploadDate =
    typeof takenAt === "number"
      ? new Date(takenAt * 1000).toISOString().slice(0, 10).replace(/-/g, "")
      : undefined

  return {
    id: shortcode,
    // Instagram posts have no title field — the caption's first line is
    // what a person would call this Reel, and it is what routing reads.
    title:
      caption.split("\n")[0]?.slice(0, 200) || `Instagram Reel ${shortcode}`,
    description: caption,
    channel: owner.username,
    uploader: owner.full_name ?? owner.username,
    duration:
      typeof node.video_duration === "number" ? node.video_duration : undefined,
    view_count: node.video_view_count ?? node.play_count,
    like_count:
      (node.edge_media_preview_like as { count?: number } | undefined)?.count ??
      node.like_count,
    comment_count:
      (node.edge_media_to_parent_comment as { count?: number } | undefined)
        ?.count ?? node.comment_count,
    upload_date: uploadDate,
    is_video: node.is_video ?? true,
    extractor: "instaloader",
  }
}

/** The single .mp4 instaloader wrote, whatever it named it. */
async function findVideo(dir: string): Promise<string> {
  const listing = await $`ls ${dir}`.nothrow().quiet()
  const file = listing.stdout
    .toString()
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.endsWith(".mp4"))
  return file ? `${dir}/${file}` : ""
}

async function readMetadata(
  dir: string,
  shortcode: string,
): Promise<Record<string, unknown>> {
  const listing = await $`ls ${dir}`.nothrow().quiet()
  const file = listing.stdout
    .toString()
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.endsWith(".json"))
  if (!file) return { id: shortcode, extractor: "instaloader" }
  const raw = await Bun.file(`${dir}/${file}`)
    .json()
    .catch(() => null)
  return raw ? mapInfo(raw as Record<string, unknown>, shortcode) : {}
}

export async function downloadWithInstaloader(
  source: ParsedSource,
  dir: string,
): Promise<{ mediaPath: string; info: Record<string, unknown> }> {
  // `--` then `-<shortcode>` is instaloader's syntax for a single post;
  // the leading dash is what marks the argument as a shortcode rather
  // than a profile name.
  const args = [
    "--no-captions",
    "--no-compress-json",
    "--quiet",
    "--dirname-pattern",
    dir,
    "--",
    `-${source.itemId}`,
  ]
  const result = await $`${config.media.instaloaderPath} ${args}`
    .nothrow()
    .quiet()

  const stderr = lastLine(result.stderr.toString())
  if (result.exitCode !== 0) {
    throw new MediaIngestError(
      UNAVAILABLE.test(stderr) ? "SOURCE_UNAVAILABLE" : "DOWNLOAD_FAILED",
      UNAVAILABLE.test(stderr)
        ? `This ${source.label} isn't publicly downloadable — it may be private, removed, or Instagram may be rate-limiting anonymous access.`
        : `Could not download this ${source.label}: ${stderr || `instaloader exited ${result.exitCode} with no output`}`,
    )
  }

  const mediaPath = await findVideo(dir)
  if (!mediaPath) {
    // A photo-only post exits 0 and writes a .jpg; there is no audio to
    // transcribe, so it is "unavailable" to this pipeline rather than a
    // tool failure.
    throw new MediaIngestError(
      "SOURCE_UNAVAILABLE",
      `This ${source.label} has no video track — Relay needs a video or audio post to transcribe.`,
    )
  }

  return { mediaPath, info: await readMetadata(dir, source.itemId) }
}

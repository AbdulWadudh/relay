import type { VerificationSummary } from "@/lib/extraction/verify"
import { logger } from "@/lib/observability/logger"
import { buildDocument } from "@/lib/render/document"
import { publishToNotion } from "@/lib/render/notion"
import { updateRun } from "@/lib/runs"

/**
 * The publishing stage (Task 4.6): document tree -> destination -> run.
 *
 * Split from pipeline.ts so the orchestrator stays a readable list of
 * stages, and so a second Ray plugs in HERE rather than inside the
 * pipeline's control flow.
 */
export async function publishRun(options: {
  runId: string
  userId: string
  sourceUrl: string
  title: string | null
  extraction: Record<string, unknown>
  agentName: string
  category: string
  emoji: string
  verification: VerificationSummary
  /**
   * The transcript streams, appended to the page in collapsed toggles.
   *
   * Passed in rather than re-read from the run: the pipeline already holds
   * them in memory at this point, and a second read would be a database
   * round trip for text that never left the process.
   */
  transcripts?: readonly { label: string; text: string }[]
}): Promise<void> {
  const {
    runId,
    userId,
    sourceUrl,
    title,
    extraction,
    agentName,
    category,
    emoji,
    verification,
    transcripts,
  } = options

  const startedAt = performance.now()
  const document = buildDocument({
    title: title ?? sourceUrl,
    extraction,
    sourceUrl,
    agentName,
    transcripts,
  })

  const published = await publishToNotion({
    userId,
    runId,
    document,
    category,
    emoji,
    // The lead paragraph doubles as the database row's Summary column.
    summary: document.summary ?? document.title,
    sourceUrl,
    agentName,
  })
  const publishMs = Math.round(performance.now() - startedAt)

  await updateRun(runId, {
    result: {
      extraction,
      verification: {
        extracted: verification.extracted,
        verified: verification.verified,
        flagged: verification.flagged,
      },
      // The destination URL is what makes a finished run actionable, so it
      // sits on `result` rather than buried in additional_data.
      published: {
        provider: "notion",
        url: published.url,
        page_id: published.pageId,
        category,
      },
    },
    timings: { publish_ms: publishMs },
    additionalData: {
      publish: {
        provider: "notion",
        page_id: published.pageId,
        category,
        category_page_id: published.categoryPageId,
        block_count: published.blockCount,
        document_blocks: document.blocks.length,
      },
    },
  })

  logger.info("Run published", {
    run_id: runId,
    url: published.url,
    publish_ms: publishMs,
  })
}

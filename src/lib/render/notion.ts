import { Client, isNotionClientError } from "@notionhq/client"

import config from "@/config"
import { logger } from "@/lib/observability/logger"
import type { RelayDocument } from "@/lib/render/document"
import { type NotionBlock, toNotionBlocks } from "@/lib/render/notion-blocks"
import {
  ensureGuidesTarget,
  NotionGuidesError,
} from "@/lib/render/notion-guides"
import { getAccessToken } from "@/lib/vault"

/**
 * The Notion Ray (PRD §4.4, Task 4.6).
 *
 * Publishes into the Guides hierarchy: a row in the category's inline
 * database, whose page content is the rendered document. The token is
 * decrypted here, held only for the call, and never logged.
 */

export { NotionGuidesError } from "@/lib/render/notion-guides"

export class NotionPublishError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "NotionPublishError"
    this.code = code
  }
}

export class NoNotionRayError extends Error {
  readonly code = "NO_NOTION_RAY"

  constructor() {
    super(
      "No Notion connection found. Connect Notion in your vault to publish.",
    )
    this.name = "NoNotionRayError"
  }
}

/** Notion caps how many blocks one request may carry. */
const MAX_BLOCKS_PER_REQUEST = 100

type PropertySchema = Record<string, { type: string }>

/**
 * Fills a property only if the data source actually has it, matching the
 * type it was created with. The user's own table uses Notion's `status`
 * type — which the API can SET but cannot CREATE — so a table Relay made
 * itself has a `select` in the same place, and both are handled.
 */
function buildProperties(
  schema: PropertySchema,
  values: { title: string; summary: string; sourceUrl: string; date: string },
): Record<string, unknown> {
  const properties: Record<string, unknown> = {}

  for (const [name, definition] of Object.entries(schema)) {
    const key = name.trim().toLowerCase()
    switch (definition.type) {
      case "title":
        properties[name] = {
          title: [
            { type: "text", text: { content: values.title.slice(0, 200) } },
          ],
        }
        break
      case "rich_text":
        if (key.includes("summary") || key.includes("description")) {
          properties[name] = {
            rich_text: [
              {
                type: "text",
                text: { content: values.summary.slice(0, 1900) },
              },
            ],
          }
        }
        break
      case "url":
        properties[name] = { url: values.sourceUrl }
        break
      case "date":
        properties[name] = { date: { start: values.date } }
        break
      case "status":
        properties[name] = { status: { name: "New" } }
        break
      case "select":
        if (key.includes("status")) {
          properties[name] = { select: { name: "New" } }
        }
        break
      default:
        break
    }
  }
  return properties
}

export interface PublishResult {
  pageId: string
  url: string
  categoryPageId: string
  blockCount: number
}

export async function publishToNotion(options: {
  userId: string
  runId: string
  document: RelayDocument
  category: string
  emoji: string
  summary: string
  sourceUrl: string
}): Promise<PublishResult> {
  const { userId, runId, document, category, emoji, summary, sourceUrl } =
    options
  const token = await getAccessToken("notion", userId)
  if (!token) throw new NoNotionRayError()

  const notion = new Client({ auth: token, timeoutMs: config.notion.timeoutMs })

  try {
    const target = await ensureGuidesTarget(notion, category, emoji)
    const source = (await notion.dataSources.retrieve({
      data_source_id: target.entriesDataSourceId,
    })) as unknown as { properties: PropertySchema }

    const blocks = toNotionBlocks(document)
    const page = await notion.pages.create({
      parent: {
        type: "data_source_id",
        data_source_id: target.entriesDataSourceId,
      },
      icon: { type: "emoji", emoji: emoji as never },
      properties: buildProperties(source.properties, {
        title: document.title,
        summary,
        sourceUrl,
        date: new Date().toISOString().slice(0, 10),
      }) as never,
      children: blocks.slice(0, MAX_BLOCKS_PER_REQUEST) as never,
    })

    for (
      let offset = MAX_BLOCKS_PER_REQUEST;
      offset < blocks.length;
      offset += MAX_BLOCKS_PER_REQUEST
    ) {
      const batch: NotionBlock[] = blocks.slice(
        offset,
        offset + MAX_BLOCKS_PER_REQUEST,
      )
      await notion.blocks.children.append({
        block_id: page.id,
        children: batch as never,
      })
    }

    const url =
      "url" in page && typeof page.url === "string"
        ? page.url
        : `https://www.notion.so/${page.id.replace(/-/g, "")}`

    logger.info("Published to Notion", {
      run_id: runId,
      page_id: page.id,
      category,
      category_page_id: target.categoryPageId,
      block_count: blocks.length,
    })

    return {
      pageId: page.id,
      url,
      categoryPageId: target.categoryPageId,
      blockCount: blocks.length,
    }
  } catch (error) {
    if (error instanceof NotionGuidesError) throw error
    if (isNotionClientError(error)) {
      const code = "code" in error ? String(error.code) : "unknown"
      throw new NotionPublishError(
        `NOTION_${code.toUpperCase()}`,
        error.message.slice(0, 300),
      )
    }
    throw error
  }
}

/** True for failures that will recur identically on retry. */
export function isPermanentPublishError(error: unknown): boolean {
  if (error instanceof NoNotionRayError) return true
  if (error instanceof NotionGuidesError) return true
  if (error instanceof NotionPublishError) {
    return (
      error.code === "NOTION_UNAUTHORIZED" ||
      error.code === "NOTION_RESTRICTED_RESOURCE" ||
      error.code === "NOTION_OBJECT_NOT_FOUND" ||
      error.code === "NOTION_VALIDATION_ERROR"
    )
  }
  return false
}

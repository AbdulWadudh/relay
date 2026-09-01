import type { Client } from "@notionhq/client"

/**
 * The Guides hierarchy in Notion (human decision 2026-09-01).
 *
 *   Guides (database, shared with the integration)
 *     └── Recipe / Places / <new category>   ← a row, page content holds:
 *           └── an inline database           ← Name · Summary · Source Link · Date · Status
 *                 └── the published page     ← a row, page content holds the document
 *
 * Everything below Guides is created on demand and reused afterwards, so a
 * new category appears once and later runs file into it.
 */

const GUIDES_DATABASE = "Guides"
/** Title of the inline database created inside each category page. */
const ENTRIES_TITLE = "Entries"

export class NotionGuidesError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "NotionGuidesError"
    this.code = code
  }
}

function plainTitle(title: { plain_text: string }[] | undefined): string {
  return (title ?? []).map((part) => part.plain_text).join("")
}

/** The name of a data source's `title`-typed property, whatever it's called. */
function titlePropertyName(
  properties: Record<string, { type: string }>,
): string {
  const entry = Object.entries(properties).find(
    ([, value]) => value.type === "title",
  )
  return entry?.[0] ?? "Name"
}

async function findGuidesDataSource(notion: Client) {
  const found = await notion.search({
    query: GUIDES_DATABASE,
    filter: { property: "object", value: "data_source" },
    page_size: 25,
  })

  for (const result of found.results) {
    const source = result as unknown as {
      id: string
      title?: { plain_text: string }[]
      properties?: Record<string, { type: string }>
    }
    if (plainTitle(source.title).trim().toLowerCase() === "guides")
      return source
  }

  throw new NotionGuidesError(
    "NOTION_NO_GUIDES",
    `No Notion database called "${GUIDES_DATABASE}" is shared with Relay. Open it in Notion, then ⋯ → Connections → add Relay, and run again.`,
  )
}

/** The category row, created with its emoji the first time it is needed. */
async function ensureCategoryPage(
  notion: Client,
  category: string,
  emoji: string,
): Promise<string> {
  const source = await findGuidesDataSource(notion)
  const titleProp = titlePropertyName(source.properties ?? {})

  const existing = await notion.dataSources.query({
    data_source_id: source.id,
    filter: { property: titleProp, title: { equals: category } },
    page_size: 1,
  })
  const match = existing.results[0]
  if (match) return match.id

  const created = await notion.pages.create({
    parent: { type: "data_source_id", data_source_id: source.id },
    icon: { type: "emoji", emoji: emoji as never },
    properties: {
      [titleProp]: { title: [{ type: "text", text: { content: category } }] },
    },
  })
  return created.id
}

/**
 * The inline database inside a category page. Reused when present, which
 * is what stops every run creating another table.
 *
 * `Status` is a `select`, not Notion's `status` type: the API can read a
 * status property but cannot create one, so a status column here would
 * fail on the very first category.
 */
async function ensureEntriesDataSource(
  notion: Client,
  categoryPageId: string,
): Promise<string> {
  const children = await notion.blocks.children.list({
    block_id: categoryPageId,
    page_size: 100,
  })
  for (const block of children.results as { id: string; type?: string }[]) {
    if (block.type !== "child_database") continue
    const database = (await notion.databases.retrieve({
      database_id: block.id,
    })) as unknown as { data_sources?: { id: string }[] }
    const first = database.data_sources?.[0]?.id
    if (first) return first
  }

  const database = (await notion.databases.create({
    parent: { type: "page_id", page_id: categoryPageId },
    title: [{ type: "text", text: { content: ENTRIES_TITLE } }],
    is_inline: true,
    initial_data_source: {
      properties: {
        Name: { title: {} },
        Summary: { rich_text: {} },
        "Source Link": { url: {} },
        Date: { date: {} },
        Status: {
          select: {
            options: [
              { name: "New", color: "brown" },
              { name: "Reviewed", color: "green" },
              { name: "Archived", color: "gray" },
            ],
          },
        },
      },
    },
  })) as unknown as { data_sources?: { id: string }[] }

  const dataSourceId = database.data_sources?.[0]?.id
  if (!dataSourceId) {
    throw new NotionGuidesError(
      "NOTION_NO_DATA_SOURCE",
      "Notion created the entries table but returned no data source to write into.",
    )
  }
  return dataSourceId
}

export interface GuidesTarget {
  categoryPageId: string
  entriesDataSourceId: string
}

export async function ensureGuidesTarget(
  notion: Client,
  category: string,
  emoji: string,
): Promise<GuidesTarget> {
  const categoryPageId = await ensureCategoryPage(notion, category, emoji)
  const entriesDataSourceId = await ensureEntriesDataSource(
    notion,
    categoryPageId,
  )
  return { categoryPageId, entriesDataSourceId }
}

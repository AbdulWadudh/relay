import type { Client } from "@notionhq/client"

import { logger } from "@/lib/observability/logger"

/**
 * The database ROW behind a published page — its columns, not its content.
 *
 * Split from notion.ts so that file stays about publishing a page. The two
 * concerns move at different rates: block rendering changes when the
 * document shape changes, column mapping changes when the user reshapes
 * their table.
 */

export type PropertySchema = Record<string, { type: string }>

/**
 * Fills a property only if the data source actually has it, matching the
 * type it was created with. The user's own table uses Notion's `status`
 * type — which the API can SET but cannot CREATE — so a table Relay made
 * itself has a `select` in the same place, and both are handled.
 */
export function buildProperties(
  schema: PropertySchema,
  values: {
    title: string
    summary: string
    sourceUrl: string
    date: string
    agentName: string
  },
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
        } else if (key.includes("agent")) {
          // Which agent produced the page, so the table can be grouped or
          // filtered by it. `rich_text` rather than `select`: a select
          // accumulates an option per agent name and the user cannot
          // rename one without breaking the rows already using it.
          properties[name] = {
            rich_text: [
              {
                type: "text",
                text: { content: values.agentName.slice(0, 200) },
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
        } else if (key.includes("agent")) {
          // Honoured if the user made the column a select themselves.
          properties[name] = {
            select: { name: values.agentName.slice(0, 100) },
          }
        }
        break
      default:
        break
    }
  }
  return properties
}

/**
 * Adds the `Agent` column to a table that predates it.
 *
 * `buildProperties` only fills columns that EXIST, which is what makes it
 * safe against a table the user shaped themselves — but it also means a
 * table created before the Agent column was introduced would silently
 * never show one. Tables Relay creates get it up front
 * (`notion-guides.ts`); this is the migration for the rest.
 *
 * Adding a column cannot destroy data, and it is attempted ONCE per
 * publish only when absent. A failure is swallowed on purpose: the user
 * may have granted read-only schema access, and a missing column is not a
 * reason to lose a published page. The page still publishes, just without
 * that one value.
 */
export async function ensureAgentColumn(
  notion: Client,
  dataSourceId: string,
  schema: PropertySchema,
): Promise<PropertySchema> {
  const present = Object.keys(schema).some((name) =>
    name.trim().toLowerCase().includes("agent"),
  )
  if (present) return schema

  try {
    // PATCH /v1/data_sources/{id} with a `properties` object — the same
    // shape `databases.create` uses for `initial_data_source`, so a
    // column added here is indistinguishable from one Relay created.
    await notion.dataSources.update({
      data_source_id: dataSourceId,
      properties: { Agent: { rich_text: {} } },
    } as never)
    // Logged at INFO, not silently: this runs once against a pre-existing
    // table and it is the only signal that the column appeared. Without
    // it, a schema this could not modify and one it modified successfully
    // look identical from the outside.
    logger.info("Added the Agent column to the Notion table", {
      data_source_id: dataSourceId,
    })
    return { ...schema, Agent: { type: "rich_text" } }
  } catch (error) {
    logger.warn("Could not add the Agent column to the Notion table", {
      error: error instanceof Error ? error.message : String(error),
    })
    return schema
  }
}

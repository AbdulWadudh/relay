import type { DocNode, RelayDocument } from "@/lib/render/document"

/**
 * The document tree mapped to Notion's NATIVE block model (PRD §4.4).
 *
 * Nothing here serialises to Markdown, and nothing goes into a code block.
 * Evidence is NOT published (human decision 2026-09-01): it is analytics,
 * it lives on the run detail page, and interleaving a toggle under every
 * line is what made the first version unreadable.
 */

export type NotionBlock = Record<string, unknown>

/** Notion rejects any single rich-text run longer than this. */
const MAX_TEXT = 2000

interface TextOptions {
  bold?: boolean
  italic?: boolean
  color?: string
}

function richText(content: string, options: TextOptions = {}) {
  const trimmed = content.slice(0, MAX_TEXT)
  if (trimmed.length === 0) return []
  return [
    {
      type: "text",
      text: { content: trimmed },
      annotations: {
        bold: options.bold ?? false,
        italic: options.italic ?? false,
        color: options.color ?? "default",
      },
    },
  ]
}

/** A label/value pair on one line: bold label, plain value. */
function factLine(label: string, value: string): NotionBlock {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        ...richText(`${label}  `, { bold: true }),
        ...richText(value),
      ],
    },
  }
}

function toBlocks(node: DocNode): NotionBlock[] {
  switch (node.type) {
    case "heading":
      return [
        {
          object: "block",
          type: "heading_2",
          heading_2: { rich_text: richText(node.text) },
        },
      ]
    case "paragraph":
      return [
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: richText(node.text) },
        },
      ]
    case "callout":
      // The lead sentence, set apart so the page opens with a sentence
      // rather than with a heading.
      return [
        {
          object: "block",
          type: "callout",
          callout: {
            icon: { type: "emoji", emoji: "📝" },
            color: "gray_background",
            rich_text: richText(node.text),
          },
        },
      ]
    case "divider":
      return [{ object: "block", type: "divider", divider: {} }]
    case "facts":
      return node.facts.map((fact) => factLine(fact.label, fact.value))
    case "bullet":
      return [
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: { rich_text: richText(node.text) },
        },
      ]
    case "step": {
      // A step's note is a child paragraph, so the numbering is unbroken
      // and the aside reads as belonging to that step.
      const children = node.note
        ? [
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: richText(node.note, {
                  italic: true,
                  color: "gray",
                }),
              },
            },
          ]
        : []
      return [
        {
          object: "block",
          type: "numbered_list_item",
          numbered_list_item: {
            rich_text: richText(node.text),
            ...(children.length > 0 ? { children } : {}),
          },
        },
      ]
    }
    case "caption":
      return [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: richText(node.text, { italic: true, color: "gray" }),
          },
        },
      ]
  }
}

export function toNotionBlocks(document: RelayDocument): NotionBlock[] {
  return document.blocks.flatMap(toBlocks)
}

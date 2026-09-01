import { parse } from "best-effort-json-parser"
import type { JsonData, ThemeInput } from "json-edit-react"

/**
 * Presentation config for the app's JSON surfaces. Themed with the app's
 * own CSS variables rather than a library preset, so it follows `.dark`
 * with no JS and cannot flash the wrong palette on first paint.
 */

/** Shared by the viewer and the editor so the two never drift apart. */
const THEME: ThemeInput = {
  displayName: "relay",
  styles: {
    container: {
      backgroundColor: "transparent",
      fontFamily: "var(--font-mono)",
      // The library pads its own container generously and these surfaces
      // already sit inside a padded panel — but zero left the collapse
      // chevron flush against the border, so keep a single unit.
      padding: "0.25rem",
      margin: "0",
    },
    property: "var(--color-foreground)",
    bracket: { color: "var(--color-muted-foreground)" },
    itemCount: { color: "var(--color-muted-foreground)", fontStyle: "normal" },
    string: "var(--color-chart-2, oklch(0.6 0.13 165))",
    number: "var(--color-chart-1, oklch(0.62 0.15 240))",
    boolean: { color: "var(--color-chart-4, oklch(0.65 0.15 60))" },
    null: { color: "var(--color-muted-foreground)", fontStyle: "italic" },
    input: ["var(--color-foreground)", { fontFamily: "var(--font-mono)" }],
    error: { color: "var(--color-destructive)" },
    iconCollection: "var(--color-muted-foreground)",
    iconEdit: "var(--color-muted-foreground)",
    iconDelete: "var(--color-destructive)",
    iconAdd: "var(--color-muted-foreground)",
    iconCopy: "var(--color-muted-foreground)",
    iconOk: "var(--color-primary)",
    iconCancel: "var(--color-destructive)",
  },
}

/**
 * Models emit almost-JSON, and a user pasting a schema drops a trailing
 * comma. Repairing on parse means neither costs the reader anything —
 * the same best-effort parser the extraction stage uses on model output.
 */
function tolerantParse(input: string): JsonData {
  try {
    return JSON.parse(input)
  } catch {
    return parse(input) as JsonData
  }
}

export const JSON_EDITOR_BASE = {
  theme: THEME,
  jsonParse: tolerantParse,
  rootFontSize: "0.75rem",
  indent: 2,
  showCollectionCount: "when-closed",
  showArrayIndices: true,
  minWidth: "100%",
  maxWidth: "100%",
} as const

import {
  DiscordIcon,
  GoogleDocIcon,
  GoogleGeminiIcon,
  GoogleSheetIcon,
  Key01Icon,
  Notion01Icon,
  SlackIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

/**
 * Single source of truth for credential providers (RULES.md: no
 * hardcoding). Adding a provider means editing THIS file only — the Zod
 * schema, Ray registry keys, and UI (labels, icons,
 * descriptions, accent styling) all derive from these lists.
 *
 * `available: false` renders a "Soon" card in the Add Ray dialog;
 * flipping it on requires a matching registry entry in
 * src/server/ray-providers.ts plus its env vars in src/config.
 */

export const AI_KEY_PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI",
    // No official OpenAI/Groq mark in HugeIcons (RULES.md: HugeIcons only) —
    // a plain key glyph is honest instead of an approximated brand mark.
    icon: Key01Icon,
    tile: "bg-zinc-700 text-white",
  },
  {
    id: "groq",
    label: "Groq",
    icon: Key01Icon,
    tile: "bg-orange-600 text-white",
  },
  {
    id: "gemini",
    label: "Gemini",
    icon: GoogleGeminiIcon,
    tile: "bg-violet-600 text-white",
  },
] as const

export interface RayProviderInfo {
  id: string
  label: string
  description: string
  icon: IconSvgElement
  available: boolean
  /** Solid hover accent for this provider's card/actions. */
  accent: string
  /** Icon tile fill. */
  tile: string
}

// Solid neutral hover shared by every provider card — the icon tile already
// carries the per-provider color, so the card itself stays neutral.
const CARD_HOVER =
  "hover:border-zinc-400 hover:bg-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"

export const RAY_PROVIDERS = [
  {
    id: "notion",
    label: "Notion",
    description: "Publish structured pages to your Notion workspace.",
    icon: Notion01Icon,
    available: true,
    accent: CARD_HOVER,
    tile: "bg-zinc-700 text-white",
  },
  {
    id: "google-docs",
    label: "Google Docs",
    description: "Sync extracted pages into Google Docs documents.",
    icon: GoogleDocIcon,
    available: false,
    accent: CARD_HOVER,
    tile: "bg-blue-600 text-white",
  },
  {
    id: "google-sheets",
    label: "Google Sheets",
    description: "Append structured rows to Google Sheets spreadsheets.",
    icon: GoogleSheetIcon,
    available: false,
    accent: CARD_HOVER,
    tile: "bg-green-600 text-white",
  },
  {
    id: "slack",
    label: "Slack",
    description: "Post processed summaries into Slack channels.",
    icon: SlackIcon,
    available: false,
    accent: CARD_HOVER,
    tile: "bg-fuchsia-600 text-white",
  },
  {
    id: "discord",
    label: "Discord",
    description: "Deliver extraction results to Discord servers.",
    icon: DiscordIcon,
    available: false,
    accent: CARD_HOVER,
    tile: "bg-indigo-600 text-white",
  },
] as const satisfies readonly RayProviderInfo[]

export const ALL_PROVIDERS = [...AI_KEY_PROVIDERS, ...RAY_PROVIDERS] as const

export type AiKeyProviderId = (typeof AI_KEY_PROVIDERS)[number]["id"]
export type RayProviderId = (typeof RAY_PROVIDERS)[number]["id"]
export type ProviderId = (typeof ALL_PROVIDERS)[number]["id"]

export const PROVIDER_IDS = ALL_PROVIDERS.map((p) => p.id) as [
  ProviderId,
  ...ProviderId[],
]

export function providerLabel(id: string): string {
  return ALL_PROVIDERS.find((p) => p.id === id)?.label ?? id
}

export function providerIcon(id: string): IconSvgElement | null {
  return ALL_PROVIDERS.find((p) => p.id === id)?.icon ?? null
}

export function providerTile(id: string): string {
  return (
    ALL_PROVIDERS.find((p) => p.id === id)?.tile ??
    "bg-muted text-muted-foreground"
  )
}

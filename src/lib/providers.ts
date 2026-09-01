import Discord from "@thesvg/react/discord"
import Gemini from "@thesvg/react/gemini"
import GoogleDocs2026 from "@thesvg/react/google-docs-2026"
import GoogleSheets2026 from "@thesvg/react/google-sheets-2026"
import Groq from "@thesvg/react/groq"
import Notion from "@thesvg/react/notion"
import Openai from "@thesvg/react/openai"
import Openrouter from "@thesvg/react/openrouter"
import Slack from "@thesvg/react/slack"
import type { ComponentType, SVGProps } from "react"

/**
 * Single source of truth for credential providers (RULES.md: no
 * hardcoding). Adding a provider means editing THIS file only — the Zod
 * schema, Ray registry keys, and UI (labels, icons,
 * descriptions, accent styling) all derive from these lists.
 *
 * Icons are official brand marks from `@thesvg/react`, rendered as-is with
 * no background chip. Most icons carry their own hardcoded brand color and
 * work on any surface. Notion and OpenAI's default marks are a color/white
 * cutout meant to sit on a filled tile, so those two use the library's
 * `currentColor`-only variant ("mono" / "light") instead so they stay
 * visible against a plain background — they just inherit the surrounding
 * text color rather than needing one baked in.
 *
 * `available: false` renders a "Soon" card in the Add Ray dialog;
 * flipping it on requires a matching registry entry in
 * src/server/ray-providers.ts plus its env vars in src/config.
 */

// Each thesvg icon component has its own narrower `variant` union, which
// doesn't unify across 8 different components — callers that need to pass
// `variant` cast to `ProviderIconWithVariant` (see the two render sites).
export type ProviderIcon = ComponentType<SVGProps<SVGSVGElement>>
export type ProviderIconWithVariant = ComponentType<
  SVGProps<SVGSVGElement> & { variant?: string }
>

export const AI_KEY_PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI",
    icon: Openai,
    iconVariant: "light",
  },
  {
    id: "groq",
    label: "Groq",
    icon: Groq,
    iconVariant: undefined,
  },
  {
    id: "gemini",
    label: "Gemini",
    icon: Gemini,
    iconVariant: undefined,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    // Like Notion and OpenAI above, the default mark is a cutout meant for
    // a filled tile — the currentColor variant stays visible on a plain
    // surface in both themes.
    icon: Openrouter,
    iconVariant: "mono",
  },
] as const

export interface RayProviderInfo {
  id: string
  label: string
  description: string
  icon: ProviderIcon
  iconVariant?: string
  available: boolean
  /** Solid hover accent for this provider's card/actions. */
  accent: string
}

// Solid neutral hover shared by every provider card.
const CARD_HOVER =
  "hover:border-zinc-400 hover:bg-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"

export const RAY_PROVIDERS = [
  {
    id: "notion",
    label: "Notion",
    description: "Publish structured pages to your Notion workspace.",
    icon: Notion,
    iconVariant: "mono",
    available: true,
    accent: CARD_HOVER,
  },
  {
    id: "google-docs",
    label: "Google Docs",
    description: "Sync extracted pages into Google Docs documents.",
    icon: GoogleDocs2026,
    iconVariant: undefined,
    available: false,
    accent: CARD_HOVER,
  },
  {
    id: "google-sheets",
    label: "Google Sheets",
    description: "Append structured rows to Google Sheets spreadsheets.",
    icon: GoogleSheets2026,
    iconVariant: undefined,
    available: false,
    accent: CARD_HOVER,
  },
  {
    id: "slack",
    label: "Slack",
    description: "Post processed summaries into Slack channels.",
    icon: Slack,
    iconVariant: undefined,
    available: false,
    accent: CARD_HOVER,
  },
  {
    id: "discord",
    label: "Discord",
    description: "Deliver extraction results to Discord servers.",
    icon: Discord,
    iconVariant: undefined,
    available: false,
    accent: CARD_HOVER,
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

export function providerIcon(id: string): ProviderIcon | null {
  return ALL_PROVIDERS.find((p) => p.id === id)?.icon ?? null
}

export function providerIconVariant(id: string): string | undefined {
  return ALL_PROVIDERS.find((p) => p.id === id)?.iconVariant
}

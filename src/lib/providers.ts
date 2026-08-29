import {
  DiscordIcon,
  GoogleDocIcon,
  GoogleSheetIcon,
  Notion01Icon,
  SlackIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

/**
 * Single source of truth for credential providers (RULES.md: no
 * hardcoding). Adding a provider means editing THIS file only — the Zod
 * schema, vault typing, OAuth registry keys, and UI (labels, icons,
 * descriptions, accent styling) all derive from these lists.
 *
 * `available: false` renders a "Soon" card in the Add Connection dialog;
 * flipping it on requires a matching registry entry in
 * src/server/oauth-providers.ts plus its env vars in src/config.
 */

export const AI_KEY_PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "groq", label: "Groq" },
  { id: "gemini", label: "Gemini" },
] as const

export interface OAuthProviderInfo {
  id: string
  label: string
  description: string
  icon: IconSvgElement
  available: boolean
  /** Vivid-UI hover accent for this provider's card/actions. */
  accent: string
  /** Icon tile tint. */
  tile: string
}

export const OAUTH_PROVIDERS = [
  {
    id: "notion",
    label: "Notion",
    description: "Publish structured pages to your Notion workspace.",
    icon: Notion01Icon,
    available: true,
    accent:
      "hover:border-zinc-300/40 hover:bg-zinc-100/5 hover:shadow-[0_0_20px_-6px_rgba(244,244,245,0.4)]",
    tile: "bg-zinc-100/10 text-zinc-100",
  },
  {
    id: "google-docs",
    label: "Google Docs",
    description: "Sync extracted pages into Google Docs documents.",
    icon: GoogleDocIcon,
    available: false,
    accent:
      "hover:border-blue-400/40 hover:bg-blue-500/5 hover:shadow-[0_0_20px_-6px_rgba(96,165,250,0.4)]",
    tile: "bg-blue-500/15 text-blue-300",
  },
  {
    id: "google-sheets",
    label: "Google Sheets",
    description: "Append structured rows to Google Sheets spreadsheets.",
    icon: GoogleSheetIcon,
    available: false,
    accent:
      "hover:border-green-400/40 hover:bg-green-500/5 hover:shadow-[0_0_20px_-6px_rgba(74,222,128,0.4)]",
    tile: "bg-green-500/15 text-green-300",
  },
  {
    id: "slack",
    label: "Slack",
    description: "Post processed summaries into Slack channels.",
    icon: SlackIcon,
    available: false,
    accent:
      "hover:border-fuchsia-400/40 hover:bg-fuchsia-500/5 hover:shadow-[0_0_20px_-6px_rgba(232,121,249,0.4)]",
    tile: "bg-fuchsia-500/15 text-fuchsia-300",
  },
  {
    id: "discord",
    label: "Discord",
    description: "Deliver extraction results to Discord servers.",
    icon: DiscordIcon,
    available: false,
    accent:
      "hover:border-indigo-400/40 hover:bg-indigo-500/5 hover:shadow-[0_0_20px_-6px_rgba(129,140,248,0.4)]",
    tile: "bg-indigo-500/15 text-indigo-300",
  },
] as const satisfies readonly OAuthProviderInfo[]

export const ALL_PROVIDERS = [...AI_KEY_PROVIDERS, ...OAUTH_PROVIDERS] as const

export type AiKeyProviderId = (typeof AI_KEY_PROVIDERS)[number]["id"]
export type OAuthProviderId = (typeof OAUTH_PROVIDERS)[number]["id"]
export type ProviderId = (typeof ALL_PROVIDERS)[number]["id"]

export const PROVIDER_IDS = ALL_PROVIDERS.map((p) => p.id) as [
  ProviderId,
  ...ProviderId[],
]

export function providerLabel(id: string): string {
  return ALL_PROVIDERS.find((p) => p.id === id)?.label ?? id
}

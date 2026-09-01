import Discord from "@thesvg/react/discord"
import Gemini from "@thesvg/react/gemini"
import GoogleDocs2026 from "@thesvg/react/google-docs-2026"
import GoogleSheets2026 from "@thesvg/react/google-sheets-2026"
import Groq from "@thesvg/react/groq"
import Instagram from "@thesvg/react/instagram"
import Notion from "@thesvg/react/notion"
import Ollama from "@thesvg/react/ollama"
import Openai from "@thesvg/react/openai"
import Openrouter from "@thesvg/react/openrouter"
import Slack from "@thesvg/react/slack"
import Youtube from "@thesvg/react/youtube"
import type { ComponentType, SVGProps } from "react"

import { MEDIA_SOURCES, type MediaSourceId } from "@/lib/media/sources"

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

/**
 * `keyless` providers hold NO credential: they are reached over the
 * network without a secret, so they never appear in the "add an API key"
 * dialog and `getAccessToken` is never called for them. Local Ollama is
 * the only one — it listens on the operator's own machine.
 *
 * The field is present on every entry rather than optional so the union
 * stays uniform and `.keyless` is always readable.
 */
export const AI_KEY_PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI",
    icon: Openai,
    iconVariant: "light",
    keyless: false,
  },
  {
    id: "groq",
    label: "Groq",
    icon: Groq,
    iconVariant: undefined,
    keyless: false,
  },
  {
    id: "gemini",
    label: "Gemini",
    icon: Gemini,
    iconVariant: undefined,
    keyless: false,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    // Like Notion and OpenAI above, the default mark is a cutout meant for
    // a filled tile — the currentColor variant stays visible on a plain
    // surface in both themes.
    icon: Openrouter,
    iconVariant: "mono",
    keyless: false,
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    // Monochrome llama silhouette — same cutout problem as Notion/OpenAI.
    icon: Ollama,
    iconVariant: "mono",
    // Reachable only when config.ollama.localEnabled is on, so a
    // production deploy with no Ollama never sees it.
    keyless: true,
  },
  {
    id: "ollama-cloud",
    label: "Ollama Cloud",
    icon: Ollama,
    iconVariant: "mono",
    keyless: false,
  },
] as const

/** AI providers that actually take a key — what the Vault offers to add. */
export const KEYED_AI_PROVIDERS = AI_KEY_PROVIDERS.filter((p) => !p.keyless)

/**
 * Per-provider accent, used by the extraction-order list so each row reads
 * as its own thing rather than five identical grey rows (RULES.md: every
 * interactive element gets its OWN accent, solid fills, no translucency).
 *
 * Both themes are specified for every value. A bare `-300`/`-400` shade
 * reads fine on this app's near-black surfaces and washes out on white,
 * which RULES.md calls out explicitly — so `chip` pairs a dark-mode shade
 * with a darker light-mode one.
 *
 * The dark hover is `-900`, NOT `-950`: against a near-black card a -950
 * tint is invisible, so dark mode lost the highlight light mode got from
 * -50. -900 is the actual visual analogue.
 */
export interface ProviderAccent {
  /** Row hover border + background highlight. */
  hover: string
  /** Icon tint, theme-paired. */
  chip: string
}

const PROVIDER_ACCENTS: Record<string, ProviderAccent> = {
  openai: {
    hover: "hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900",
    chip: "text-teal-700 dark:text-teal-300",
  },
  groq: {
    hover:
      "hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900",
    chip: "text-orange-700 dark:text-orange-300",
  },
  gemini: {
    hover: "hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900",
    chip: "text-blue-700 dark:text-blue-300",
  },
  openrouter: {
    hover:
      "hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900",
    chip: "text-violet-700 dark:text-violet-300",
  },
  ollama: {
    hover:
      "hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900",
    chip: "text-emerald-700 dark:text-emerald-300",
  },
  "ollama-cloud": {
    hover:
      "hover:border-fuchsia-500 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900",
    chip: "text-fuchsia-700 dark:text-fuchsia-300",
  },
}

const NEUTRAL_ACCENT: ProviderAccent = {
  hover: "hover:border-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800",
  chip: "text-zinc-700 dark:text-zinc-300",
}

export function providerAccent(id: string): ProviderAccent {
  return PROVIDER_ACCENTS[id] ?? NEUTRAL_ACCENT
}

export function isKeylessProvider(id: string): boolean {
  return AI_KEY_PROVIDERS.some((p) => p.id === id && p.keyless)
}

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

export interface SocialProviderInfo {
  id: MediaSourceId
  /** The PLATFORM name — MEDIA_SOURCES.label names one item ("Reel"). */
  label: string
  description: string
  icon: ProviderIcon
  iconVariant?: string
  available: boolean
  accent: string
}

/**
 * Per-platform presentation for a captured social session credential
 * (`type: "cookie"` — SESSION_AUTH.md §3).
 *
 * Keyed `Record<MediaSourceId, ...>` on purpose: adding a source to
 * src/lib/media/sources.ts becomes a COMPILE ERROR until it has a Vault
 * presence, the same exhaustiveness trick src/components/queue/source-icon.tsx
 * uses. That is what keeps the two registries from silently drifting.
 */
const SOCIAL_DETAIL: Record<
  MediaSourceId,
  Omit<SocialProviderInfo, "id" | "accent">
> = {
  instagram: {
    label: "Instagram",
    description: "Sign in so Relay can fetch Reels as you.",
    icon: Instagram,
    iconVariant: undefined,
    available: true,
  },
  youtube: {
    label: "YouTube",
    description: "Sign in so Relay can fetch Shorts as you.",
    icon: Youtube,
    iconVariant: undefined,
    available: true,
  },
}

/**
 * Derived from MEDIA_SOURCES rather than hand-listed, so a social
 * credential's `provider` IS the media source id and the download-time
 * lookup needs no mapping table (SESSION_AUTH.md §2.4).
 *
 * `available` gates the card: a source with no entry in
 * src/lib/capture/providers.ts cannot be signed into and renders "Soon".
 */
export const SOCIAL_PROVIDERS: readonly SocialProviderInfo[] =
  MEDIA_SOURCES.map((source) => ({
    id: source.id,
    accent: CARD_HOVER,
    ...SOCIAL_DETAIL[source.id],
  }))

export const ALL_PROVIDERS = [
  ...AI_KEY_PROVIDERS,
  ...RAY_PROVIDERS,
  ...SOCIAL_PROVIDERS,
] as const

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

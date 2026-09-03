import { MEDIA_SOURCES, type MediaSourceId } from "@/lib/media/sources"

/**
 * Single source of truth for credential providers (RULES.md: no
 * hardcoding). Adding a provider means editing THIS file only — the Zod
 * schema, Ray registry keys, and the UI all derive from these lists.
 *
 * PLAIN DATA: no React import and no icon components, so this catalog is
 * shareable with a non-DOM renderer. Brand marks live in
 * src/lib/provider-icons.ts, keyed by the ids declared here.
 *
 * `available: false` renders a "Soon" card in the Add Ray dialog;
 * flipping it on requires a matching registry entry in
 * src/server/ray-providers.ts plus its env vars in src/config.
 */

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
    keyless: false,
  },
  {
    id: "groq",
    label: "Groq",
    keyless: false,
  },
  {
    id: "gemini",
    label: "Gemini",
    keyless: false,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    keyless: false,
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    // Reachable only when config.ollama.localEnabled is on, so a
    // production deploy with no Ollama never sees it.
    keyless: true,
  },
  {
    id: "ollama-cloud",
    label: "Ollama Cloud",
    keyless: false,
  },
] as const

/** AI providers that actually take a key — what the Vault offers to add. */
export const KEYED_AI_PROVIDERS = AI_KEY_PROVIDERS.filter((p) => !p.keyless)

export function isKeylessProvider(id: string): boolean {
  return AI_KEY_PROVIDERS.some((p) => p.id === id && p.keyless)
}

export interface RayProviderInfo {
  id: string
  label: string
  description: string
  available: boolean
}

export const RAY_PROVIDERS = [
  {
    id: "notion",
    label: "Notion",
    description: "Publish structured pages to your Notion workspace.",
    available: true,
  },
  {
    id: "google-docs",
    label: "Google Docs",
    description: "Sync extracted pages into Google Docs documents.",
    available: false,
  },
  {
    id: "google-sheets",
    label: "Google Sheets",
    description: "Append structured rows to Google Sheets spreadsheets.",
    available: false,
  },
  {
    id: "slack",
    label: "Slack",
    description: "Post processed summaries into Slack channels.",
    available: false,
  },
  {
    id: "discord",
    label: "Discord",
    description: "Deliver extraction results to Discord servers.",
    available: false,
  },
] as const satisfies readonly RayProviderInfo[]

export interface SocialProviderInfo {
  id: MediaSourceId
  /** The PLATFORM name — MEDIA_SOURCES.label names one item ("Reel"). */
  label: string
  description: string
  available: boolean
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
const SOCIAL_DETAIL: Record<MediaSourceId, Omit<SocialProviderInfo, "id">> = {
  instagram: {
    label: "Instagram",
    description: "Sign in so Relay can fetch Reels as you.",
    available: true,
  },
  youtube: {
    label: "YouTube",
    description: "Sign in so Relay can fetch Shorts as you.",
    available: true,
  },
}

/**
 * Derived from MEDIA_SOURCES rather than hand-listed, so a social
 * credential's `provider` IS the media source id and the download-time
 * lookup needs no mapping table (SESSION_AUTH.md §2.4).
 *
 * `available` gates the card: a source with no entry in
 * src/lib/social/providers.ts cannot be signed into and renders "Soon".
 */
export const SOCIAL_PROVIDERS: readonly SocialProviderInfo[] =
  MEDIA_SOURCES.map((source) => ({
    id: source.id,
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

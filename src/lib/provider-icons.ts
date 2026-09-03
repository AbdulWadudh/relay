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

import type { ProviderId } from "@/lib/providers"

/**
 * Brand marks for the provider catalog, split out of src/lib/providers.ts so
 * that catalog stays plain data — no React import — and can be shared with a
 * non-DOM renderer.
 */

// Each thesvg component has its own narrower `variant` union, which doesn't
// unify across 12 components; callers needing `variant` cast to this.
export type ProviderIcon = ComponentType<SVGProps<SVGSVGElement>>
export type ProviderIconWithVariant = ComponentType<
  SVGProps<SVGSVGElement> & { variant?: string }
>

interface ProviderMarkSpec {
  icon: ProviderIcon
  /**
   * Notion, OpenAI, OpenRouter and Ollama ship a colour/white cutout meant
   * to sit on a filled tile, so they use the library's currentColor-only
   * variant to stay visible on a plain background. A full-colour mark has
   * none and must be left alone or it flattens to a silhouette.
   */
  variant?: string
}

// Record<ProviderId, …> so adding a provider is a compile error until it has
// a mark — the same exhaustiveness trick source-icon.tsx uses.
const PROVIDER_MARKS: Record<ProviderId, ProviderMarkSpec> = {
  openai: { icon: Openai, variant: "light" },
  groq: { icon: Groq },
  gemini: { icon: Gemini },
  openrouter: { icon: Openrouter, variant: "mono" },
  ollama: { icon: Ollama, variant: "mono" },
  "ollama-cloud": { icon: Ollama, variant: "mono" },
  notion: { icon: Notion, variant: "mono" },
  "google-docs": { icon: GoogleDocs2026 },
  "google-sheets": { icon: GoogleSheets2026 },
  slack: { icon: Slack },
  discord: { icon: Discord },
  instagram: { icon: Instagram },
  youtube: { icon: Youtube },
}

const MARKS: Record<string, ProviderMarkSpec | undefined> = PROVIDER_MARKS

export function providerIcon(id: string): ProviderIcon | null {
  return MARKS[id]?.icon ?? null
}

export function providerIconVariant(id: string): string | undefined {
  return MARKS[id]?.variant
}

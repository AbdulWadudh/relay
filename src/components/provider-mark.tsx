"use client"

import {
  type ProviderIconWithVariant,
  providerAccent,
  providerIcon,
  providerIconVariant,
} from "@/lib/providers"
import { cn } from "@/lib/utils"

/**
 * A provider's brand mark, resolved from its id.
 *
 * This existed five times in slightly different forms — the Vault table,
 * the run's Agents & models panel, the extraction-order rows, and two
 * provider grids — each repeating the same three lookups and the same
 * "tint only the currentColor variants" rule. That rule is the subtle bit:
 * marks like Notion, OpenAI and Ollama ship a `mono`/`light` cutout meant
 * for a filled tile, so they need the accent colour to be visible at all,
 * while a full-colour mark must be left alone or it turns into a silhouette.
 *
 * Renders nothing for an unknown id rather than a placeholder box, so a
 * provider without a bundled mark degrades to just its label.
 */
export function ProviderMark({
  provider,
  className,
  tinted = true,
}: {
  provider: string
  className?: string
  /** Set false where the surrounding text colour should win. */
  tinted?: boolean
}) {
  const Icon = providerIcon(provider) as ProviderIconWithVariant | null
  if (!Icon) return null
  const variant = providerIconVariant(provider)
  const accent = providerAccent(provider)

  return (
    <Icon
      variant={variant}
      aria-hidden
      className={cn(
        "shrink-0",
        // Only the cutout variants take the tint; a full-colour mark keeps
        // its own brand colours.
        tinted && variant ? accent.chip : undefined,
        className,
      )}
    />
  )
}

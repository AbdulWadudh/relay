"use client"

import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ProviderMark } from "@/components/provider-mark"
import { KEYED_AI_PROVIDERS, providerAccent } from "@/lib/providers"
import { cn } from "@/lib/utils"

/**
 * Picks an AI provider by its BRAND MARK, not from a text dropdown.
 *
 * The dropdown this replaces was the only surface in the app that showed
 * providers as bare strings — every other one (the Vault table, the Ray and
 * Account tabs, the run's Agents & models panel) shows the logo. It also
 * made the three tabs of the add-credential dialog look like three
 * different products. One picker, one visual language.
 *
 * Each card carries that provider's OWN accent (RULES.md: no single global
 * accent, solid fills, no translucency), paired for light and dark. Motion
 * is a staggered entrance plus a 1px lift — deliberately NOT `hover:scale`,
 * which promotes the card to its own layer and re-rasterises the text as a
 * visible blur.
 */

export function ProviderPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (id: string) => void
}) {
  return (
    <div
      className="grid gap-2 sm:grid-cols-2"
      role="radiogroup"
      aria-label="Provider"
    >
      {KEYED_AI_PROVIDERS.map((provider, index) => {
        const accent = providerAccent(provider.id)
        const active = value === provider.id

        return (
          // biome-ignore lint/a11y/useSemanticElements: an <input type="radio">
          // cannot contain a card layout. WAI-ARIA's radio group pattern is
          // exactly button+role="radio" inside role="radiogroup", which is
          // what this is.
          <button
            key={provider.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(provider.id)}
            style={{ animationDelay: `${index * 50}ms` }}
            className={cn(
              "group/pick fade-in slide-in-from-bottom-1 flex animate-in items-center gap-3 rounded-lg border fill-mode-both p-3 text-start",
              "transition-all duration-200 hover:-translate-y-px active:translate-y-0",
              active ? accent.selected : cn("border-border", accent.hover),
            )}
          >
            <ProviderMark
              provider={provider.id}
              className="size-6 transition-transform duration-300 ease-out group-hover/pick:-rotate-6"
            />
            <span className="min-w-0 flex-1 truncate font-medium text-sm">
              {provider.label}
            </span>
            {/* Reserved whether or not it is filled, so picking a provider
                does not nudge the label sideways. */}
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                active ? accent.solid : "bg-transparent",
              )}
            >
              {active ? (
                <HugeiconsIcon
                  icon={Tick02Icon}
                  strokeWidth={3}
                  className="zoom-in size-3 animate-in text-white duration-200"
                />
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

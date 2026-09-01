"use client"

import { ProviderCard } from "@/components/vault/provider-card"
import { RAY_PROVIDERS } from "@/lib/providers"

/**
 * Ray destinations, for the "Ray" tab. A card is only live when the
 * provider is both implemented AND has its client id/secret configured —
 * those are different failures, so they say different things.
 */
export function RayProviderGrid({
  configuredIds,
}: {
  configuredIds: string[]
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {RAY_PROVIDERS.map((provider, index) => {
        const configured = configuredIds.includes(provider.id)
        return (
          <ProviderCard
            key={provider.id}
            id={provider.id}
            label={provider.label}
            description={provider.description}
            index={index}
            badge={
              !provider.available
                ? { text: "Soon", className: "border-transparent bg-amber-600" }
                : !configured
                  ? {
                      text: "Needs setup",
                      className: "border-transparent bg-red-600",
                    }
                  : undefined
            }
            disabledReason={
              !provider.available
                ? `${provider.label} support is on the roadmap`
                : !configured
                  ? `Set the ${provider.label} Ray client id/secret in .env.local first`
                  : undefined
            }
            href={`/api/v1/rays/oauth/${provider.id}`}
          />
        )
      })}
    </div>
  )
}

"use client"

import { ProviderCard } from "@/components/vault/provider-card"
import { SOCIAL_PROVIDERS } from "@/lib/providers"

/**
 * Media SOURCES to sign in to, for the "Account" tab.
 *
 * A source with no entry in src/lib/capture/providers.ts cannot be signed
 * into and renders "Soon" — availability is the capture registry, not a
 * flag someone remembered to flip.
 */
export function SocialProviderGrid({
  onConnect,
}: {
  onConnect: (providerId: string) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SOCIAL_PROVIDERS.map((provider, index) => (
        <ProviderCard
          key={provider.id}
          id={provider.id}
          label={provider.label}
          description={provider.description}
          index={index}
          badge={
            provider.available
              ? undefined
              : { text: "Soon", className: "border-transparent bg-amber-600" }
          }
          disabledReason={
            provider.available
              ? undefined
              : `${provider.label} sign-in is not implemented yet`
          }
          onClick={() => onConnect(provider.id)}
        />
      ))}
    </div>
  )
}

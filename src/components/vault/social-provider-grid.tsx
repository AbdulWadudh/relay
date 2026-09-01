"use client"

import { Badge } from "@/components/ui/badge"
import {
  type ProviderIconWithVariant,
  providerAccent,
  SOCIAL_PROVIDERS,
  type SocialProviderInfo,
} from "@/lib/providers"
import { cn } from "@/lib/utils"

/**
 * Media SOURCES to sign in to, for the "Account" tab of the add-credential
 * dialog. Distinct from a Ray: a Ray is somewhere Relay publishes to, this
 * is somewhere it reads from, and the credential is a session cookie rather
 * than an OAuth token.
 *
 * A source with no entry in src/lib/capture/providers.ts cannot be signed
 * into and renders "Soon".
 */

function SocialCard({
  provider,
  index,
  onConnect,
}: {
  provider: SocialProviderInfo
  index: number
  onConnect: () => void
}) {
  const Icon = provider.icon as ProviderIconWithVariant
  const accent = providerAccent(provider.id)

  return (
    <button
      type="button"
      disabled={!provider.available}
      onClick={onConnect}
      style={{ animationDelay: `${index * 70}ms` }}
      className={cn(
        "group/card fade-in slide-in-from-bottom-2 flex w-full animate-in items-center gap-4 rounded-xl border fill-mode-both p-4 text-start transition-all duration-200",
        provider.available
          ? cn(accent.hover, "active:scale-[0.98]")
          : "cursor-not-allowed opacity-60",
      )}
    >
      <Icon
        variant={provider.iconVariant}
        className={cn(
          "size-10 shrink-0 transition-transform duration-300 ease-out group-hover/card:-rotate-3 group-hover/card:scale-110",
          provider.iconVariant ? accent.chip : undefined,
        )}
      />
      <span className="grid flex-1 gap-1 text-start leading-snug">
        <span className="flex items-center gap-2 font-medium text-base">
          {provider.label}
          {!provider.available ? (
            <Badge className="border-transparent bg-amber-600 text-[10px] text-white">
              Soon
            </Badge>
          ) : null}
        </span>
        <span className="text-muted-foreground text-sm">
          {provider.description}
        </span>
      </span>
    </button>
  )
}

export function SocialProviderGrid({
  onConnect,
}: {
  onConnect: (providerId: string) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SOCIAL_PROVIDERS.map((provider, index) => (
        <SocialCard
          key={provider.id}
          provider={provider}
          index={index}
          onConnect={() => onConnect(provider.id)}
        />
      ))}
    </div>
  )
}

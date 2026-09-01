"use client"

import { UserSharingIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ConnectSessionDialog } from "@/components/vault/connect-session-dialog"
import {
  type ProviderIconWithVariant,
  providerAccent,
  SOCIAL_PROVIDERS,
  type SocialProviderInfo,
} from "@/lib/providers"
import { cn } from "@/lib/utils"

/**
 * "Connect account": sign in to a media SOURCE so Relay can fetch as you.
 *
 * Deliberately separate from "Add Ray". A Ray is a destination Relay
 * publishes to; this is a source it reads from, and the credential is a
 * session cookie rather than an OAuth token. Folding them into one dialog
 * would put two different things behind one word.
 */

function SocialCard({
  provider,
  onConnect,
}: {
  provider: SocialProviderInfo
  onConnect: () => void
}) {
  const Icon = provider.icon as ProviderIconWithVariant
  const accent = providerAccent(provider.id)

  return (
    <button
      type="button"
      disabled={!provider.available}
      onClick={onConnect}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border border-border bg-card p-4 text-left",
        "transition-colors duration-150",
        provider.available ? accent.hover : "cursor-not-allowed opacity-60",
      )}
    >
      <span className="flex w-full items-center gap-3">
        <Icon
          className={cn(
            "size-6 shrink-0",
            provider.iconVariant ? accent.chip : undefined,
          )}
          variant={provider.iconVariant}
          aria-hidden
        />
        <span className="font-medium text-sm">{provider.label}</span>
        {!provider.available ? (
          <Badge variant="secondary" className="ml-auto">
            Soon
          </Badge>
        ) : null}
      </span>
      <span className="text-muted-foreground text-xs leading-relaxed">
        {provider.description}
      </span>
    </button>
  )
}

export function AddSocialDialog() {
  const [listOpen, setListOpen] = React.useState(false)
  const [connecting, setConnecting] = React.useState<string | null>(null)

  return (
    <>
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogTrigger
          render={
            <Button
              variant="outline"
              className="transition-all duration-200 hover:-translate-y-px hover:border-fuchsia-600 hover:bg-fuchsia-600 hover:text-white dark:hover:bg-fuchsia-600"
            />
          }
        >
          <HugeiconsIcon
            icon={UserSharingIcon}
            data-icon="inline-start"
            className="transition-transform duration-300 group-hover/button:scale-110"
          />
          Connect account
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Connect an account</DialogTitle>
            <DialogDescription className="text-sm">
              Sign in so Relay can fetch posts as you, instead of anonymously.
              You sign in on the platform's own page — Relay stores only the
              session cookie, encrypted, and never your password.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {SOCIAL_PROVIDERS.map((provider) => (
              <SocialCard
                key={provider.id}
                provider={provider}
                onConnect={() => {
                  setListOpen(false)
                  setConnecting(provider.id)
                }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {connecting ? (
        <ConnectSessionDialog
          provider={connecting}
          open={true}
          onOpenChange={(open) => {
            if (!open) setConnecting(null)
          }}
        />
      ) : null}
    </>
  )
}

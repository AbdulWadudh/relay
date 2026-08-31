"use client"

import { PlugSocketIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

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
import {
  type ProviderIconWithVariant,
  RAY_PROVIDERS,
  type RayProviderInfo,
} from "@/lib/providers"
import { cn } from "@/lib/utils"

/**
 * "Add Ray" dialog: one card per catalog provider. Available +
 * configured cards launch the generic /rays/oauth/:provider flow; available
 * but unconfigured cards hint at the missing env; the rest show "Soon".
 */

function ProviderCard({
  provider,
  configured,
  index,
}: {
  provider: RayProviderInfo
  configured: boolean
  index: number
}) {
  const enabled = provider.available && configured
  const Icon = provider.icon as ProviderIconWithVariant
  const body = (
    <>
      <Icon
        variant={provider.iconVariant}
        className="size-10 shrink-0 transition-transform duration-300 ease-out group-hover/card:-rotate-3 group-hover/card:scale-110"
      />
      <span className="grid flex-1 gap-1 text-start leading-snug">
        <span className="flex items-center gap-2 font-medium text-base">
          {provider.label}
          {!provider.available ? (
            <Badge className="border-transparent bg-amber-600 text-[10px] text-white">
              Soon
            </Badge>
          ) : !configured ? (
            <Badge className="border-transparent bg-red-600 text-[10px] text-white">
              Needs setup
            </Badge>
          ) : null}
        </span>
        <span className="text-muted-foreground text-sm">
          {provider.description}
        </span>
      </span>
    </>
  )

  const base = cn(
    "group/card fade-in slide-in-from-bottom-2 flex w-full animate-in items-center gap-4 rounded-xl border fill-mode-both p-4 text-start transition-all duration-200",
  )

  if (enabled) {
    return (
      <a
        href={`/api/v1/rays/oauth/${provider.id}`}
        style={{ animationDelay: `${index * 70}ms` }}
        className={cn(base, "active:scale-[0.98]", provider.accent)}
      >
        {body}
      </a>
    )
  }
  return (
    <div
      style={{ animationDelay: `${index * 70}ms` }}
      className={cn(base, "cursor-not-allowed opacity-60")}
      title={
        provider.available
          ? `Set the ${provider.label} Ray client id/secret in .env.local first`
          : `${provider.label} support is on the roadmap`
      }
    >
      {body}
    </div>
  )
}

export function AddConnectionDialog({
  configuredIds,
}: {
  configuredIds: string[]
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="transition-all duration-200 hover:scale-[1.03] hover:border-sky-600 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600"
          />
        }
      >
        <HugeiconsIcon
          icon={PlugSocketIcon}
          data-icon="inline-start"
          className="transition-transform duration-300 group-hover/button:rotate-12"
        />
        Add Ray
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Add a Ray</DialogTitle>
          <DialogDescription className="text-sm">
            Connect a destination workspace. Tokens are encrypted with
            AES-256-GCM and connecting again adds another account.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {RAY_PROVIDERS.map((provider, index) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              configured={configuredIds.includes(provider.id)}
              index={index}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

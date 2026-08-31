"use client"

import { RefreshIcon, VaultIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AddConnectionDialog } from "@/components/vault/add-connection-dialog"
import { DeleteCredential } from "@/components/vault/delete-credential"
import {
  type ProviderIconWithVariant,
  providerIcon,
  providerIconVariant,
  providerLabel,
} from "@/lib/providers"
import type { MaskedCredential } from "@/lib/vault"

/** Presentational pieces of a vault row, split out of credentials-table. */

export const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" })

export function metaString(
  credential: MaskedCredential,
  key: string,
): string | null {
  const value = credential.metaData?.[key]
  return typeof value === "string" && value.length > 0 ? value : null
}

/** Account name (provider registry contract), only when distinct from the provider itself. */
export function accountNameFor(credential: MaskedCredential): string | null {
  const name = metaString(credential, "account_name")
  return name && name !== providerLabel(credential.provider) ? name : null
}

export function accountEmailFor(credential: MaskedCredential): string | null {
  return metaString(credential, "account_email")
}

export function ProviderTile({ provider }: { provider: string }) {
  const Icon = providerIcon(provider) as ProviderIconWithVariant | null
  return Icon ? (
    <Icon variant={providerIconVariant(provider)} className="size-8 shrink-0" />
  ) : null
}

export function TypeBadge({ type }: { type: MaskedCredential["type"] }) {
  return type === "oauth" ? (
    <Badge className="shrink-0 border-transparent bg-violet-600 text-white">
      OAuth
    </Badge>
  ) : (
    <Badge className="shrink-0 border-transparent bg-emerald-600 text-white">
      API key
    </Badge>
  )
}

export function RowActions({ credential }: { credential: MaskedCredential }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {credential.type === "oauth" ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                nativeButton={false}
                className="transition-all duration-200 hover:scale-110 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600"
                aria-label={`Reconnect ${providerLabel(credential.provider)}`}
                render={
                  <a href={`/api/v1/rays/oauth/${credential.provider}`} />
                }
              />
            }
          >
            <HugeiconsIcon icon={RefreshIcon} strokeWidth={1.5} />
          </TooltipTrigger>
          <TooltipContent>
            Reconnect {providerLabel(credential.provider)}
          </TooltipContent>
        </Tooltip>
      ) : null}
      <DeleteCredential
        credentialId={credential.id}
        providerLabel={providerLabel(credential.provider)}
      />
    </div>
  )
}

export function VaultEmpty({ configuredIds }: { configuredIds: string[] }) {
  return (
    <Empty className="fade-in zoom-in-95 animate-in rounded-lg border border-dashed fill-mode-both transition-colors duration-300 hover:border-emerald-500/40">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-emerald-600 text-white">
          <HugeiconsIcon
            icon={VaultIcon}
            strokeWidth={1.5}
            className="animate-pulse"
          />
        </EmptyMedia>
        <EmptyTitle>The vault is empty</EmptyTitle>
        <EmptyDescription>
          Add an AI provider key or connect a workspace to start processing
          videos.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <AddConnectionDialog configuredIds={configuredIds} />
      </EmptyContent>
    </Empty>
  )
}

"use client"

import { RefreshIcon, VaultIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"
import { ProviderMark } from "@/components/provider-mark"
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
import { AddCredentialDialog } from "@/components/vault/add-credential-dialog"
import { ConnectSessionDialog } from "@/components/vault/connect-session-dialog"
import { DeleteCredential } from "@/components/vault/delete-credential"
import { EditCredentialDialog } from "@/components/vault/edit-credential-dialog"
import { providerLabel } from "@/lib/providers"
import { cn } from "@/lib/utils"
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

/** The user's own label if set, otherwise the provider's name. */
export function displayName(credential: MaskedCredential): string {
  return credential.label ?? providerLabel(credential.provider)
}

export function ProviderTile({ provider }: { provider: string }) {
  return <ProviderMark provider={provider} className="size-8" />
}

/**
 * Exhaustive over `credentials.type` on purpose. It was an oauth/else
 * ternary, so the new `cookie` type fell through and a captured social
 * session rendered as "API key" — the wrong thing entirely, and invisible
 * until a session actually existed. `Record<CredentialType, …>` makes the
 * next added type a compile error instead.
 */
const TYPE_BADGE: Record<
  MaskedCredential["type"],
  { label: string; className: string }
> = {
  oauth: { label: "OAuth", className: "bg-violet-600" },
  api_key: { label: "API key", className: "bg-emerald-600" },
  cookie: { label: "Session", className: "bg-fuchsia-600" },
}

export function TypeBadge({ type }: { type: MaskedCredential["type"] }) {
  const badge = TYPE_BADGE[type]
  return (
    <Badge
      className={cn("shrink-0 border-transparent text-white", badge.className)}
    >
      {badge.label}
    </Badge>
  )
}

/**
 * Shown only once the jar has been rejected `staleAfterRejects` times in a
 * row (SESSION_AUTH.md §4.3) — a healthy session needs no call to action,
 * and a single transient checkpoint should not nag. Row-scoped per
 * RULES.md:60: this operates on an existing record, so it lives in the
 * record's own row rather than the page header.
 */
function ReconnectSession({ credential }: { credential: MaskedCredential }) {
  const [open, setOpen] = React.useState(false)
  const label = providerLabel(credential.provider)
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-amber-700 transition-all duration-200 hover:-translate-y-px hover:bg-amber-600 hover:text-white dark:text-amber-300 dark:hover:bg-amber-600"
              aria-label={`Reconnect ${label}`}
              onClick={() => setOpen(true)}
            />
          }
        >
          <HugeiconsIcon icon={RefreshIcon} strokeWidth={1.5} />
        </TooltipTrigger>
        <TooltipContent>
          Session expired — sign in to {label} again
        </TooltipContent>
      </Tooltip>
      <ConnectSessionDialog
        provider={credential.provider}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

/** Sits beside the type badge so the row explains itself without a hover. */
export function StaleBadge({ credential }: { credential: MaskedCredential }) {
  if (!credential.stale) return null
  return (
    <Badge className="shrink-0 border-transparent bg-amber-600 text-white">
      Expired
    </Badge>
  )
}

export function RowActions({ credential }: { credential: MaskedCredential }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {credential.type === "cookie" && credential.stale ? (
        <ReconnectSession credential={credential} />
      ) : null}
      {credential.type === "oauth" ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                nativeButton={false}
                className="transition-all duration-200 hover:-translate-y-px hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600"
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
      <EditCredentialDialog credential={credential} />
      <DeleteCredential
        credentialId={credential.id}
        providerLabel={credential.label ?? providerLabel(credential.provider)}
      />
    </div>
  )
}

export function VaultEmpty({ configuredIds }: { configuredIds: string[] }) {
  return (
    <Empty className="rounded-lg border border-dashed transition-colors duration-300 hover:border-emerald-500/40">
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
        <AddCredentialDialog configuredIds={configuredIds} />
      </EmptyContent>
    </Empty>
  )
}

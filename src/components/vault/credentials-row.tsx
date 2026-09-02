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
import { DeleteCredential } from "@/components/vault/delete-credential"
import { EditCredentialDialog } from "@/components/vault/edit-credential-dialog"
import { ImportSessionDialog } from "@/components/vault/import-session-dialog"
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
 * Offered on EVERY cookie row, not only a stale one.
 *
 * SESSION_AUTH.md §4.3 gates the *prompt* on `staleAfterRejects` so a
 * single transient checkpoint does not nag, and that still holds — but a
 * jar can be dead long before Relay has tried it twice (the user signed
 * out elsewhere, or Google rotated the session), and until then the row
 * offered no way to replace it at all. Gating the alarm is right; gating
 * the *action* left the only fix unreachable.
 *
 * So the button is always here and stale only changes its urgency: amber
 * and "expired" once rejected, quiet otherwise. Row-scoped per
 * RULES.md:60 — it operates on an existing record, so it lives in that
 * record's row rather than the page header.
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
              className={cn(
                "transition-all duration-200 hover:-translate-y-px hover:text-white",
                credential.stale
                  ? "text-amber-700 hover:bg-amber-600 dark:text-amber-300 dark:hover:bg-amber-600"
                  : "hover:bg-fuchsia-600 dark:hover:bg-fuchsia-600",
              )}
              aria-label={`Reconnect ${label}`}
              onClick={() => setOpen(true)}
            />
          }
        >
          <HugeiconsIcon icon={RefreshIcon} strokeWidth={1.5} />
        </TooltipTrigger>
        <TooltipContent>
          {credential.stale
            ? `Session expired. Sign in to ${label} again`
            : `Replace this ${label} session with a fresh export`}
        </TooltipContent>
      </Tooltip>
      <ImportSessionDialog
        provider={credential.provider}
        open={open}
        onOpenChange={setOpen}
        // Names the row being reconnected, so the fresh jar REPLACES this
        // credential instead of landing beside it. YouTube publishes no
        // non-secret account id, so this row's own id is the only identity
        // the import has to dedupe on.
        replaces={credential.id}
        // `account_name`, not `credential.label` — the import route stores
        // the name the user typed under the registry's generic account key,
        // while `toMasked` derives `label` from `meta_data.label`, which a
        // cookie credential never has. Reading the wrong one silently
        // prefilled nothing and a reconnect dropped the account's name.
        defaultLabel={metaString(credential, "account_name") ?? undefined}
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
      {credential.type === "cookie" ? (
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

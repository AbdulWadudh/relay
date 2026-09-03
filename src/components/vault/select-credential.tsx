"use client"

import {
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  PinIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { providerLabel } from "@/lib/providers"
import {
  useCredentials,
  useSelectCredential,
  useSetCredentialActive,
} from "@/lib/query/credentials"
import { cn } from "@/lib/utils"
import type { MaskedCredential } from "@/lib/vault"

/**
 * Which of a provider's credentials Relay uses, and in what order.
 *
 * `active` is per-credential: off means the pipeline never reaches for it.
 * `selected` orders the ones that are on — the first is tried, the rest are
 * fallbacks for a rate-limited or rejected key. The ordering controls hide
 * themselves when the provider holds only one credential, since there is no
 * choice to present.
 */

/**
 * What distinguishes this row from its siblings: they share a provider, so
 * the provider name alone would label every one of them identically. Read
 * from `meta_data` here rather than reusing credentials-row.tsx, which
 * imports this file.
 */
function describe(credential: MaskedCredential): string {
  if (credential.label) return credential.label
  for (const key of ["account_name", "account_email"]) {
    const value = credential.metaData?.[key]
    if (typeof value === "string" && value.length > 0) return value
  }
  return providerLabel(credential.provider)
}

function hasSiblings(
  rows: MaskedCredential[] | undefined,
  credential: MaskedCredential,
): boolean {
  if (!rows) return false
  return rows.filter((row) => row.provider === credential.provider).length > 1
}

export function ChainBadge({ credential }: { credential: MaskedCredential }) {
  const { data } = useCredentials()
  if (!credential.active || !hasSiblings(data, credential)) return null
  return (
    <Badge
      className={cn(
        "zoom-in shrink-0 animate-in border-transparent text-white duration-200",
        credential.selected ? "bg-indigo-600" : "bg-slate-600",
      )}
    >
      {credential.selected ? "First" : "Fallback"}
    </Badge>
  )
}

/**
 * Switching the last active credential off is allowed: the provider is then
 * simply unconfigured, which is the same state as never having added a key.
 *
 * A tick/cross toggle rather than a Switch so it reads at a glance in a
 * dense row and matches the ordering control beside it.
 */
export function CredentialActiveToggle({
  credential,
}: {
  credential: MaskedCredential
}) {
  const setActive = useSetCredentialActive()
  const active = credential.active
  const account = describe(credential)
  const label = providerLabel(credential.provider)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={setActive.isPending}
            className={cn(
              "transition-all duration-200 hover:-translate-y-px hover:text-white",
              active
                ? "text-emerald-700 hover:bg-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-600"
                : "text-red-700 hover:bg-red-600 dark:text-red-400 dark:hover:bg-red-600",
            )}
            aria-label={
              active
                ? `Stop using ${account} for ${label}`
                : `Use ${account} for ${label}`
            }
            onClick={() =>
              setActive.mutate(
                { id: credential.id, active: !active },
                {
                  onError: () =>
                    toast.add({
                      type: "error",
                      title: "Could not change the credential",
                    }),
                },
              )
            }
          />
        }
      >
        <HugeiconsIcon
          icon={active ? CheckmarkCircle02Icon : CancelCircleIcon}
          strokeWidth={2}
        />
      </TooltipTrigger>
      <TooltipContent>
        {active
          ? `On — switch this ${label} account off`
          : `Off — switch this ${label} account on`}
      </TooltipContent>
    </Tooltip>
  )
}

export function SelectCredential({
  credential,
}: {
  credential: MaskedCredential
}) {
  const { data } = useCredentials()
  const select = useSelectCredential()
  if (!credential.active || !hasSiblings(data, credential)) return null

  const label = providerLabel(credential.provider)
  const account = describe(credential)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={credential.selected || select.isPending}
            className={cn(
              "transition-all duration-200",
              credential.selected
                ? "text-indigo-700 disabled:opacity-100 dark:text-indigo-300"
                : "hover:-translate-y-px hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600",
            )}
            aria-label={
              credential.selected
                ? `${account} is the ${label} account Relay tries first`
                : `Try ${account} first for ${label}`
            }
            onClick={() => {
              if (!credential.selected) select.mutate(credential.id)
            }}
          />
        }
      >
        <HugeiconsIcon
          icon={PinIcon}
          strokeWidth={credential.selected ? 2.5 : 1.5}
        />
      </TooltipTrigger>
      <TooltipContent>
        {credential.selected
          ? `Relay tries this ${label} account first`
          : `Try this ${label} account first`}
      </TooltipContent>
    </Tooltip>
  )
}

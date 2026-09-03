"use client"

import {
  CancelCircleIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { providerLabel } from "@/lib/providers"
import { useSetCredentialActive } from "@/lib/query/credentials"
import { cn } from "@/lib/utils"
import type { MaskedCredential } from "@/lib/vault"

/**
 * Whether a credential is in the fallback chain at all.
 *
 * ORDER is not here: it is one flat cross-provider list, so it belongs in
 * Settings -> Extraction priority (src/components/settings), not spread
 * across vault rows that can only see one provider each.
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

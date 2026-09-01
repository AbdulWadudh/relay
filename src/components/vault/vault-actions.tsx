"use client"

import { useQueryClient } from "@tanstack/react-query"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import * as React from "react"

import { toast } from "@/components/ui/toast"
import { AddCredentialDialog } from "@/components/vault/add-credential-dialog"
import { credentialKeys } from "@/lib/query/keys"

/**
 * Vault header actions.
 *
 * ONE button. Three separate ones (Add Ray / Connect account / Add API Key)
 * overflowed the header on a small screen, and RULES.md treats mobile as
 * first-class. They are now tabs inside a single dialog, split by the
 * credentials.type vocabulary itself.
 */
export function VaultActions({ configuredIds }: { configuredIds: string[] }) {
  return <AddCredentialDialog configuredIds={configuredIds} />
}

/** Surfaces Ray redirect results (?connected= / ?error=) as toasts. */
export function VaultNotices() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()

  React.useEffect(() => {
    const connected = params.get("connected")
    const error = params.get("error")
    if (!connected && !error) return
    if (connected === "notion") {
      // The OAuth callback wrote the credential server-side, outside any
      // mutation, so the cached list has to be refetched explicitly.
      queryClient.invalidateQueries({ queryKey: credentialKeys.lists() })
      toast.add({ type: "success", title: "Notion workspace connected" })
    } else if (error) {
      toast.add({
        type: "error",
        title: "Notion connection failed",
        description: "Check this Ray's configuration and try again.",
      })
    }
    router.replace(pathname, { scroll: false })
  }, [params, router, pathname, queryClient])

  return null
}

"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { apiFetch } from "@/lib/query/http"
import { credentialKeys } from "@/lib/query/keys"
import type { MaskedCredential } from "@/lib/vault"

/**
 * Importing a browser-exported social session (SESSION_AUTH.md §2).
 *
 * The jar is held in component state for exactly as long as the dialog is
 * open and is never cached by TanStack Query — hence a mutation with no
 * key, and no `onSuccess` that echoes the input back.
 */

export interface ImportResult {
  credential: MaskedCredential
  /** In-scope cookies stored. */
  kept: number
  /** Cookies dropped for belonging to another site. */
  discarded: number
}

export function useImportCookies() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      provider: string
      cookieJar: string
      label?: string
    }): Promise<ImportResult> =>
      await apiFetch<ImportResult>(
        `/social/${encodeURIComponent(input.provider)}/import`,
        {
          method: "POST",
          body: JSON.stringify({
            cookieJar: input.cookieJar,
            label: input.label,
          }),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: credentialKeys.lists() })
    },
  })
}

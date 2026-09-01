"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { apiFetch } from "@/lib/query/http"
import { credentialKeys } from "@/lib/query/keys"
import type { MaskedCredential } from "@/lib/vault"

/**
 * Session-capture mutations.
 *
 * The ticket returned by `useStartCapture` authorises exactly one socket
 * and expires in a minute, so it is held in component state and never
 * cached, persisted, or logged.
 */

export interface StartedCapture {
  sessionId: string
  ticket: string
  wsUrl: string
  expiresAt: number
}

export class CaptureBusyError extends Error {
  readonly retryAfter: number

  constructor(retryAfter: number) {
    super("Another sign-in is already in progress. Try again in a minute.")
    this.name = "CaptureBusyError"
    this.retryAfter = retryAfter
  }
}

export function useStartCapture() {
  return useMutation({
    mutationFn: async (provider: string): Promise<StartedCapture> => {
      try {
        return await apiFetch<StartedCapture>(
          `/capture/${encodeURIComponent(provider)}`,
          { method: "POST", body: JSON.stringify({}) },
        )
      } catch (error) {
        // The cap is a normal outcome, not a fault — it gets its own type
        // so the dialog can say "try again in a minute" rather than
        // "something went wrong".
        const message = error instanceof Error ? error.message : ""
        if (message.includes("already in progress")) {
          throw new CaptureBusyError(60)
        }
        throw error
      }
    },
  })
}

export function useFinishCapture() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      provider: string
      sessionId: string
      label?: string
    }) => {
      const { credential } = await apiFetch<{ credential: MaskedCredential }>(
        `/capture/${encodeURIComponent(input.provider)}/${encodeURIComponent(input.sessionId)}/finish`,
        { method: "POST", body: JSON.stringify({ label: input.label }) },
      )
      return credential
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: credentialKeys.lists() })
    },
  })
}

/**
 * Best-effort cancel. Fired when the dialog closes, including on unmount,
 * so a slot is freed immediately rather than waiting out the idle timeout.
 */
export async function cancelCapture(
  provider: string,
  sessionId: string,
): Promise<void> {
  await apiFetch(
    `/capture/${encodeURIComponent(provider)}/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" },
  ).catch(() => {})
}

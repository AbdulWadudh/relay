"use client"

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { apiFetch } from "@/lib/query/http"
import { credentialKeys, settingKeys } from "@/lib/query/keys"
import type { CredentialInput, CredentialUpdateInput } from "@/lib/schemas"
import type { MaskedCredential } from "@/lib/vault"

/**
 * Vault server-state. Responses are always masked — no token material is
 * ever cached client-side, only the metadata the table renders.
 */

async function fetchCredentials(): Promise<MaskedCredential[]> {
  const { credentials } = await apiFetch<{ credentials: MaskedCredential[] }>(
    "/credentials",
  )
  return credentials
}

export function credentialsQueryOptions() {
  return queryOptions({
    queryKey: credentialKeys.list(),
    queryFn: fetchCredentials,
  })
}

export function useCredentials() {
  return useQuery(credentialsQueryOptions())
}

export function useCreateCredential() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CredentialInput) => {
      const { credential } = await apiFetch<{ credential: MaskedCredential }>(
        "/credentials",
        { method: "POST", body: JSON.stringify(input) },
      )
      return credential
    },
    // Encryption happens server-side, so the masked row only exists once
    // the write returns — nothing to show optimistically.
    onSuccess: (credential) => {
      queryClient.setQueryData<MaskedCredential[]>(
        credentialKeys.list(),
        (previous) => (previous ? [...previous, credential] : previous),
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.lists() })
    },
  })
}

/** Optimistic delete — the row leaves immediately, restored on failure. */
export function useDeleteCredential() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/credentials/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: credentialKeys.lists() })
      const previous = queryClient.getQueryData<MaskedCredential[]>(
        credentialKeys.list(),
      )
      queryClient.setQueryData<MaskedCredential[]>(
        credentialKeys.list(),
        (rows) => rows?.filter((row) => row.id !== id),
      )
      return { previous }
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(credentialKeys.list(), context.previous)
      }
    },
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.lists() })
      queryClient.removeQueries({ queryKey: credentialKeys.detail(id) })
    },
  })
}

export interface UpdateCredentialVariables {
  id: string
  input: CredentialUpdateInput
}

/** Rename and/or rotate a secret. Responses stay masked. */
export function useUpdateCredential() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: UpdateCredentialVariables) => {
      const { credential } = await apiFetch<{ credential: MaskedCredential }>(
        `/credentials/${id}`,
        { method: "PATCH", body: JSON.stringify(input) },
      )
      return credential
    },
    onSuccess: (credential) => {
      queryClient.setQueryData<MaskedCredential[]>(
        credentialKeys.list(),
        (previous) =>
          previous?.map((row) => (row.id === credential.id ? credential : row)),
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.lists() })
    },
  })
}

export interface SetCredentialActiveVariables {
  id: string
  active: boolean
}

/**
 * Switches a credential in or out of the fallback chain. The server returns
 * the WHOLE list, because a credential leaving the chain can shift where
 * others sit in it.
 */
export function useSetCredentialActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, active }: SetCredentialActiveVariables) => {
      const { credentials } = await apiFetch<{
        credentials: MaskedCredential[]
      }>(`/credentials/${id}/active`, {
        method: "PUT",
        body: JSON.stringify({ active }),
      })
      return credentials
    },
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: credentialKeys.lists() })
      const previous = queryClient.getQueryData<MaskedCredential[]>(
        credentialKeys.list(),
      )
      queryClient.setQueryData<MaskedCredential[]>(
        credentialKeys.list(),
        (rows) =>
          rows?.map((row) => (row.id === id ? { ...row, active } : row)),
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(credentialKeys.list(), context.previous)
      }
    },
    onSuccess: (credentials) => {
      queryClient.setQueryData(credentialKeys.list(), credentials)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.lists() })
      // Settings renders the same credential in every stage's chain, greyed
      // when it is off, so those lists are stale now too.
      queryClient.invalidateQueries({ queryKey: settingKeys.chains() })
    },
  })
}

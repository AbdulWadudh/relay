/**
 * Domain-shaped query keys. Each domain narrows from broad to specific
 * (`all` -> `lists()` -> `list()` / `details()` -> `detail(id)`) so writes
 * can invalidate exactly the slice they touched: passing `lists()` matches
 * every list variant without disturbing cached detail entries, and `all`
 * is the escape hatch for "this whole domain changed".
 *
 * Kept free of client-only imports so Server Components can prefetch
 * against the same keys the browser hydrates.
 */

export const agentKeys = {
  all: ["agents"] as const,
  lists: () => [...agentKeys.all, "list"] as const,
  // No server-side filters yet; add `list(filters)` here when the API
  // grows them, and the invalidation below keeps working unchanged.
  list: () => [...agentKeys.lists()] as const,
  details: () => [...agentKeys.all, "detail"] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
}

export const runKeys = {
  all: ["runs"] as const,
  lists: () => [...runKeys.all, "list"] as const,
  /** Page is part of the key: pages cache separately and a refetch of
   *  page 2 must not clobber page 1. */
  list: (page = 1) => [...runKeys.lists(), page] as const,
  details: () => [...runKeys.all, "detail"] as const,
  detail: (id: string) => [...runKeys.details(), id] as const,
  /** Separate from `detail`: logs poll on their own cadence and are only
   *  fetched once a stage is actually expanded. */
  logs: (id: string) => [...runKeys.all, "logs", id] as const,
}

export const promptKeys = {
  all: ["prompts"] as const,
  lists: () => [...promptKeys.all, "list"] as const,
  list: () => [...promptKeys.lists()] as const,
  details: () => [...promptKeys.all, "detail"] as const,
  detail: (key: string) => [...promptKeys.details(), key] as const,
}

export const settingKeys = {
  all: ["settings"] as const,
  details: () => [...settingKeys.all, "detail"] as const,
  detail: (key: string) => [...settingKeys.details(), key] as const,
  extractionOrder: () => [...settingKeys.detail("extraction-order")] as const,
}

export const credentialKeys = {
  all: ["credentials"] as const,
  lists: () => [...credentialKeys.all, "list"] as const,
  list: () => [...credentialKeys.lists()] as const,
  details: () => [...credentialKeys.all, "detail"] as const,
  detail: (id: string) => [...credentialKeys.details(), id] as const,
}

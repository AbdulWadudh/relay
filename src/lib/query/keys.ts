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
  list: () => [...runKeys.lists()] as const,
  details: () => [...runKeys.all, "detail"] as const,
  detail: (id: string) => [...runKeys.details(), id] as const,
}

export const credentialKeys = {
  all: ["credentials"] as const,
  lists: () => [...credentialKeys.all, "list"] as const,
  list: () => [...credentialKeys.lists()] as const,
  details: () => [...credentialKeys.all, "detail"] as const,
  detail: (id: string) => [...credentialKeys.details(), id] as const,
}

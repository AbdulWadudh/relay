import config from "@/config"

/**
 * Typed fetch wrapper for the Hono API (`/api/v1/*`). Every query and
 * mutation function in `src/lib/query/` goes through this, so error shape
 * and JSON handling are identical everywhere.
 */

export const API_BASE = `/api/${config.api.version}`

/** Mirrors the `{ error, issues? }` body every route returns on failure. */
export class ApiError extends Error {
  readonly status: number
  readonly issues?: unknown

  constructor(status: number, message: string, issues?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.issues = issues
  }

  /** 4xx means the request itself was wrong — retrying won't help. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { headers, ...rest } = init
  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
  })

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string; issues?: unknown })
    | null

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error ?? `Request failed (${response.status})`,
      payload?.issues,
    )
  }
  return payload as T
}

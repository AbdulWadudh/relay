import config from "@/config"
import type { RayProviderId } from "@/lib/providers"

/**
 * Ray provider registry. Adding a provider (e.g. Google Docs/Sheets):
 * add its id to RAY_PROVIDERS in src/lib/providers.ts, its env vars to
 * src/config, and one entry here — the /rays/:provider routes are fully
 * generic.
 */

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  owner?: {
    type?: string
    user?: {
      name?: string | null
      avatar_url?: string | null
      person?: { email?: string }
    }
  }
  [key: string]: unknown
}

export interface RayProvider {
  /** Vault provider id, derived from the provider catalog. */
  name: RayProviderId
  authorizeUrl: string
  tokenUrl: string
  clientId: string
  clientSecret: string
  scopes?: string[]
  /** Provider-specific query params for the authorize redirect. */
  extraAuthParams?: Record<string, string>
  /**
   * Plaintext meta_data extracted from the token response.
   * CONTRACT (RULES.md: nothing provider-specific in common files): the
   * result MUST include the generic account identity keys consumed by the
   * vault and UI — `account_id` (dedupe key), `account_name`,
   * `account_email`, `account_avatar` — mapped from whatever the provider
   * calls them. Provider-specific extras may be included alongside.
   */
  mapMetaData: (token: TokenResponse) => Record<string, unknown> & {
    account_id?: string
    account_name?: string
    account_email?: string
    account_avatar?: string
  }
}

// Partial: catalog entries flagged `available: false` have no flow yet.
const providers: Partial<Record<RayProviderId, RayProvider>> = {
  notion: {
    name: "notion",
    authorizeUrl: config.notion.authorizeUrl,
    tokenUrl: config.notion.tokenUrl,
    clientId: config.notion.clientId,
    clientSecret: config.notion.clientSecret,
    // prompt=consent forces Notion's consent/account screen on every
    // connect instead of silently reusing the previous grant.
    extraAuthParams: { owner: "user", prompt: "consent" },
    mapMetaData: (token) => ({
      // Generic account identity (vault/UI contract).
      account_id: token.workspace_id as string | undefined,
      account_name:
        (token.workspace_name as string | undefined) ??
        token.owner?.user?.name ??
        undefined,
      account_email: token.owner?.user?.person?.email,
      account_avatar:
        (token.workspace_icon as string | undefined) ??
        token.owner?.user?.avatar_url ??
        undefined,
      // Notion-specific extras (used by the publishing pipeline).
      bot_id: token.bot_id,
      workspace_id: token.workspace_id,
      owner_type: token.owner?.type,
    }),
  },
}

export function getProvider(name: string): RayProvider | null {
  return (providers as Record<string, RayProvider | undefined>)[name] ?? null
}

export function isConfigured(provider: RayProvider): boolean {
  return Boolean(provider.clientId && provider.clientSecret)
}

/** Provider ids whose Ray credentials are configured (server-only). */
export function configuredRayIds(): string[] {
  return Object.values(providers)
    .filter((p): p is RayProvider => Boolean(p) && isConfigured(p))
    .map((p) => p.name)
}

export function redirectUri(provider: RayProvider): string {
  return `${config.app.baseUrl}/api/v1/rays/${provider.name}/callback`
}

export function stateCookieName(provider: RayProvider): string {
  return `ray_state_${provider.name}`
}

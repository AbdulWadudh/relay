import config from "@/config"

/**
 * OAuth provider registry. Adding a provider (e.g. Google Docs/Sheets)
 * is one entry here plus its env vars in src/config — the /oauth/:provider
 * routes are fully generic.
 */

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  [key: string]: unknown
}

export interface OAuthProvider {
  /** Vault provider id; must be allowed by credentialInputSchema. */
  name: "notion"
  authorizeUrl: string
  tokenUrl: string
  clientId: string
  clientSecret: string
  scopes?: string[]
  /** Provider-specific query params for the authorize redirect. */
  extraAuthParams?: Record<string, string>
  /** Plaintext meta_data extracted from the token response. */
  mapMetaData: (token: TokenResponse) => Record<string, unknown>
}

const providers: Record<string, OAuthProvider> = {
  notion: {
    name: "notion",
    authorizeUrl: config.notion.authorizeUrl,
    tokenUrl: config.notion.tokenUrl,
    clientId: config.notion.clientId,
    clientSecret: config.notion.clientSecret,
    extraAuthParams: { owner: "user" },
    mapMetaData: (token) => ({
      bot_id: token.bot_id,
      workspace_id: token.workspace_id,
      workspace_name: token.workspace_name,
      workspace_icon: token.workspace_icon,
      owner_type: (token.owner as { type?: string } | undefined)?.type,
    }),
  },
}

export function getProvider(name: string): OAuthProvider | null {
  return providers[name] ?? null
}

export function isConfigured(provider: OAuthProvider): boolean {
  return Boolean(provider.clientId && provider.clientSecret)
}

export function redirectUri(provider: OAuthProvider): string {
  return `${config.app.baseUrl}/api/${config.api.version}/oauth/${provider.name}/callback`
}

export function stateCookieName(provider: OAuthProvider): string {
  return `oauth_state_${provider.name}`
}

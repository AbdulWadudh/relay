const PORT = Number(process.env.PORT ?? 3000)
const BASE_URL = process.env.APP_BASE_URL ?? `http://localhost:${PORT}`

export const config = {
  app: {
    name: "Relay",
    description:
      "Self-hosted bridge from short-form video to structured markdown pages — evidence-grounded extraction, BYOK, local media processing.",
    version: "0.1.0",
    baseUrl: BASE_URL,
  },
  server: {
    port: PORT,
    host: process.env.HOST ?? "localhost",
    allowedHosts: (process.env.ALLOWED_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim())
      .filter((host) => host.length > 0),
  },
  api: {
    version: "v1",
  },
  database: {
    url: (process.env.DATABASE_URL ?? "file:./local.db").replace(
      /^turso:\/\//,
      "libsql://",
    ),
    authToken: process.env.DATABASE_TOKEN,
  },
  vault: {
    keyHex: process.env.VAULT_KEY ?? "",
  },
  assets: {
    favicon: "/logo.ico",
    logo: "/logo.svg",
  },
  theme: {
    storageKey: "theme",
  },
  observability: {
    url: process.env.OPENOBSERVE_URL ?? "",
    org: process.env.OPENOBSERVE_ORG ?? "default",
    user: process.env.OPENOBSERVE_USER ?? "",
    token: process.env.OPENOBSERVE_TOKEN ?? "",
    streams: {
      server: "relay_server",
      client: "relay_client",
    },
  },
} as const

export default config

export type AppConfig = typeof config

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
  auth: {
    baseUrl: BASE_URL,
    secret: process.env.VAULT_KEY ?? "",
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
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
  links: {
    /**
     * Favicon service for link hosts with no bundled brand mark.
     * `{host}` is substituted. Set FAVICON_SERVICE_URL="" to disable it
     * entirely and fall back to a generic glyph — the request is made by
     * the user's browser, so it is a third party seeing which domains
     * appear in your run data.
     */
    faviconUrl:
      process.env.FAVICON_SERVICE_URL ??
      "https://icons.duckduckgo.com/ip3/{host}.ico",
  },
  assets: {
    favicon: "/logo.ico",
    logo: "/logo.png",
  },
  theme: {
    storageKey: "theme",
  },
  queue: {
    // Dragonfly speaks the Redis wire protocol; BullMQ reaches it through
    // ioredis. IMPORTANT: the Dragonfly server must run with
    // `--default_lua_flags=allow-undeclared-keys` — BullMQ's Lua scripts
    // build key names dynamically, which Dragonfly rejects by default with
    // "script tried accessing undeclared key" on the very first job.
    url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    name: "relay-runs",
    /**
     * BullMQ key prefix, hash-tagged on purpose — Dragonfly's documented
     * BullMQ setup, paired with `--cluster_mode=emulated
     * --lock_on_hashtags` on the server.
     *
     * This is a THROUGHPUT choice, not a correctness one: measured
     * locally, an un-tagged prefix still works fine under emulated cluster
     * mode (single node, so no CROSSSLOT enforcement). The `{...}` tag
     * pins every key of this queue to one Dragonfly thread, which is what
     * lets its multi-threaded engine run BullMQ's multi-key Lua scripts
     * without coordinating across threads.
     *
     * If a second queue is added later, give it a DIFFERENT tag so the
     * queues spread across threads — unless they have parent/child job
     * dependencies, which must share a tag.
     */
    prefix: "{relay}",
    // Runs are I/O-bound (download, Whisper, LLM), so a small pool of
    // concurrent jobs per worker keeps the box responsive.
    concurrency: Number(process.env.QUEUE_CONCURRENCY ?? 2),
    attempts: Number(process.env.QUEUE_ATTEMPTS ?? 2),
    backoffMs: Number(process.env.QUEUE_BACKOFF_MS ?? 5000),
  },
  media: {
    // Host binaries (TRD §1). Overridable so operators can point at an
    // absolute path when the binaries aren't on the service account's PATH.
    ytDlpPath: process.env.YT_DLP_PATH ?? "yt-dlp",
    ffmpegPath: process.env.FFMPEG_PATH ?? "ffmpeg",
    // Per-run scratch space, inside the mounted data volume so a container
    // restart can't strand artifacts somewhere unmanaged.
    tempDir: process.env.MEDIA_TEMP_DIR ?? "./data/tmp",
    // Whisper endpoints want small mono audio and cap upload size; these
    // values are the ffmpeg extraction target.
    audio: {
      format: "mp3",
      codec: "libmp3lame",
      sampleRate: "16000",
      channels: "1",
      bitrate: "64k",
    },
  },
  notion: {
    clientId: process.env.NOTION_CLIENT_ID ?? "",
    clientSecret: process.env.NOTION_CLIENT_SECRET ?? "",
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    redirectPath: "/api/v1/rays/oauth/notion/callback",
  },
  observability: {
    url: process.env.OPENOBSERVE_URL ?? "",
    org: process.env.OPENOBSERVE_ORG ?? "default",
    token: process.env.OPENOBSERVE_TOKEN ?? "",
    streams: {
      server: "relay_server",
      client: "relay_client",
    },
  },
} as const

export default config

export type AppConfig = typeof config

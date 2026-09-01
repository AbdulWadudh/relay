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
    /**
     * Loopback port for the worker's liveness endpoint
     * (src/lib/queue/health.ts). Never published — the container's own
     * healthcheck is its only caller, so it must match the port the
     * healthcheck probes in docker-compose.yml.
     */
    healthPort: Number(process.env.QUEUE_HEALTH_PORT ?? 3001),
  },
  llm: {
    /**
     * Hard ceiling on one chat completion. Free models occasionally accept
     * a request and never answer; without this the worker sits on that
     * socket forever and the run never fails over to the next candidate.
     */
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 120000),
  },
  cache: {
    /**
     * Redis/Dragonfly is the hot cache in front of the database for
     * pipeline prompts and provider model catalogs (human decision
     * 2026-09-01). The database stays the source of truth — a cold or
     * unreachable cache costs a query, never correctness — and every write
     * invalidates its key rather than waiting for the TTL.
     *
     * Namespaced separately from the BullMQ prefix so flushing one never
     * takes the other with it.
     */
    prefix: "relay:cache",
    promptTtlSeconds: Number(process.env.CACHE_PROMPT_TTL ?? 3600),
    // Provider catalogs turn over daily, so this is the ceiling on how
    // long a newly published model stays invisible to the router.
    catalogTtlSeconds: Number(process.env.CACHE_CATALOG_TTL ?? 86400),
  },
  media: {
    // Host binaries (TRD §1). Overridable so operators can point at an
    // absolute path when the binaries aren't on the service account's PATH.
    ytDlpPath: process.env.YT_DLP_PATH ?? "yt-dlp",
    // Instagram refuses yt-dlp anonymously ("rate-limit reached or login
    // required") but serves instaloader, which is why the two sources use
    // different downloaders. Verified 2026-09-01 on the exact Reel a run
    // had already failed on.
    instaloaderPath: process.env.INSTALOADER_PATH ?? "instaloader",
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
    apiBaseUrl: "https://api.notion.com/v1",
    // Notion pins behaviour to a dated API version; omitting it makes the
    // block payloads this app sends subject to silent format changes.
    apiVersion: "2022-06-28",
    timeoutMs: Number(process.env.NOTION_TIMEOUT_MS ?? 20000),
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

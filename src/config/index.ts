const PORT = Number(process.env.PORT ?? 3000)
const BASE_URL = process.env.APP_BASE_URL ?? `http://localhost:${PORT}`

const YOUTUBE_CLIENTS = (
  process.env.YT_DLP_YOUTUBE_CLIENTS ?? "web_embedded,mweb"
)
  .split(",")
  .map((client) => client.trim())
  .filter((client) => client.length > 0)

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
    url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    name: "relay-runs",
    /**
     * BullMQ key prefix, hash-tagged on purpose — Dragonfly's documented
     * BullMQ setup, paired with `--cluster_mode=emulated
     * --lock_on_hashtags` on the server.
     */
    prefix: "{relay}",
    concurrency: Number(process.env.QUEUE_CONCURRENCY ?? 2),
    attempts: Number(process.env.QUEUE_ATTEMPTS ?? 2),
    backoffMs: Number(process.env.QUEUE_BACKOFF_MS ?? 5000),
    healthPort: Number(process.env.QUEUE_HEALTH_PORT ?? 3001),
    perUserConcurrency: Number(process.env.QUEUE_PER_USER_CONCURRENCY ?? 1),
    userSlotTtlMs: Number(process.env.QUEUE_USER_SLOT_TTL_MS ?? 1_800_000),
    /** How long a run waits before re-checking a busy user slot. */
    deferMs: Number(process.env.QUEUE_DEFER_MS ?? 2000),
  },
  llm: {
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 120000),
  },
  social: {
    staleAfterRejects: Number(process.env.SOCIAL_STALE_AFTER_REJECTS ?? 2),
    ratePerHour: Number(process.env.SOCIAL_RATE_PER_HOUR ?? 10),
    ratePerDay: Number(process.env.SOCIAL_RATE_PER_DAY ?? 50),
  },
  ollama: {
    localEnabled: process.env.OLLAMA_LOCAL_ENABLED === "true",
    localBaseUrl: process.env.OLLAMA_LOCAL_URL ?? "http://127.0.0.1:11434/v1",
    cloudBaseUrl: process.env.OLLAMA_CLOUD_URL ?? "https://ollama.com/v1",
    localApiKey: "ollama",
    contextLength: Number(process.env.OLLAMA_CONTEXT_LENGTH ?? 32768),
  },
  cache: {
    prefix: "relay:cache",
    promptTtlSeconds: Number(process.env.CACHE_PROMPT_TTL ?? 3600),
    catalogTtlSeconds: Number(process.env.CACHE_CATALOG_TTL ?? 86400),
    timeoutMs: Number(process.env.CACHE_TIMEOUT_MS ?? 250),
  },
  media: {
    ytDlpPath: process.env.YT_DLP_PATH ?? "yt-dlp",
    ffmpegPath: process.env.FFMPEG_PATH ?? "ffmpeg",
    /**
     * Egress proxy for sources marked `proxied` in
     * src/lib/media/sources.ts. Any value yt-dlp's `--proxy` accepts
     * (`socks5://host:port`, `http://host:port`).
     *
     * WHY THIS EXISTS. YouTube refuses DATACENTER addresses, and a VPS is
     * nothing but a datacenter address. MEASURED 2026-09-03 from the
     * production host against 12 real Shorts, same pinned yt-dlp
     * (2026.03.17), same format selector, minutes apart:
     *
     *   direct from the VPS       0/12 — every one "not a bot"
     *   through a WARP sidecar   11/12 — all on the DEFAULT client
     *   residential connection   11/12 — byte-identical
     *
     * The twelfth (LiH-P4rSkLI) 403s from a residential connection too,
     * so it is a source-side problem this cannot fix and must not claim
     * to. Proxied prod is not "better" than residential, it is EQUAL to
     * it — which is the whole objective.
     *
     * Empty disables it: the source's `proxied` flag is then inert and
     * every invocation is byte-for-byte what shipped before, which is
     * what makes this safe to roll back by clearing one variable.
     *
     * NEVER logged and NEVER allowed into a user-visible error, because
     * this may legitimately carry credentials (`socks5://user:pass@host`)
     * — see `scrubProxy` in src/lib/media/download.ts.
     */
    proxyUrl: process.env.MEDIA_PROXY_URL ?? "",
    /**
     * Ordered `--extractor-args` fallbacks, keyed by media source id
     * (src/lib/media/sources.ts). Tried in sequence when a download fails
     * the MEDIA fetch with a 403 — metadata resolves fine, then the CDN
     * refuses the stream.
     *
     * Measured 2026-09-01 on yt-dlp 2026.03.17: the default client chain
     * 403s on roughly HALF of YouTube items — including ordinary Shorts,
     * not just music — while `web_embedded`, `mweb` and `tv_simply` each
     * served every item the default chain lost. `tv`, `android_vr` and
     * `ios` do NOT work, so this is not simply "any non-default client".
     *
     * Which clients YouTube serves is a moving target it changes without
     * notice, hence env-overridable rather than compiled into the pipeline.
     * A source with no entry here simply gets no retry.
     */
    ytDlpFallbacks: {
      youtube: YOUTUBE_CLIENTS.map(
        (client) => `youtube:player_client=${client}`,
      ),
    } as Record<string, readonly string[] | undefined>,
    tempDir: process.env.MEDIA_TEMP_DIR ?? "./data/tmp",
    audio: {
      format: "mp3",
      codec: "libmp3lame",
      sampleRate: "16000",
      channels: "1",
      bitrate: "64k",
    },
    /**
     * The frames path (PRD §4.2, "no speech" branch). Every value here was
     * measured against a real 64s Short, not guessed — LLM_STATE.md
     * 2026-09-04 has the numbers.
     */
    frames: {
      /**
       * `bv*` with a res SORT, not `bv*[height<=480]` — the filter form
       * picked 240x426, too narrow for small overlay text. This gives
       * 480x854 h264 video-only, ~1.5 MB for a 20s Reel.
       */
      format: process.env.FRAMES_FORMAT ?? "bv*",
      formatSort: process.env.FRAMES_FORMAT_SORT ?? "res:480,+size",
      /** 2x2. Four frames cover a Short; more shrinks every cell. */
      columns: Number(process.env.FRAMES_COLUMNS ?? 2),
      rows: Number(process.env.FRAMES_ROWS ?? 2),
      /**
       * Per-cell width. 480 is legible for burned-in captions and street
       * signage; 360 is marginal, and for a Short the overlay text IS the
       * content, so this is not the thing to economise on.
       */
      cellWidth: Number(process.env.FRAMES_CELL_WIDTH ?? 480),
      /** ffmpeg `scene` score above which a frame counts as a cut. */
      sceneThreshold: Number(process.env.FRAMES_SCENE_THRESHOLD ?? 0.15),
      jpegQuality: Number(process.env.FRAMES_JPEG_QUALITY ?? 3),
    },
  },
  notion: {
    clientId: process.env.NOTION_CLIENT_ID ?? "",
    clientSecret: process.env.NOTION_CLIENT_SECRET ?? "",
    apiBaseUrl: "https://api.notion.com/v1",
    apiVersion: "2022-06-28",
    timeoutMs: Number(process.env.NOTION_TIMEOUT_MS ?? 20000),
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    redirectPath: "/api/v1/rays/oauth/notion/callback",
  },
  observability: {
    logFile: process.env.LOG_FILE ?? "./data/logs/relay.log",
    service: process.env.SERVICE_NAME ?? "relay-api",
    url: process.env.OPENOBSERVE_URL ?? "",
    org: process.env.OPENOBSERVE_ORG ?? "default",
    token: process.env.OPENOBSERVE_TOKEN ?? "",
    runLogs: {
      maxLines: Number(process.env.RUN_LOG_MAX_LINES ?? 500),
      ttlSeconds: Number(process.env.RUN_LOG_TTL_SECONDS ?? 86400),
      historyDays: Number(process.env.RUN_LOG_HISTORY_DAYS ?? 30),
    },
    streams: {
      server: "relay_server",
      client: "relay_client",
    },
  },
} as const

export default config

export type AppConfig = typeof config

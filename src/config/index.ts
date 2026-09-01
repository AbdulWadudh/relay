const PORT = Number(process.env.PORT ?? 3000)
const BASE_URL = process.env.APP_BASE_URL ?? `http://localhost:${PORT}`

/**
 * yt-dlp `player_client` values tried, in order, when YouTube refuses the
 * media fetch on the default client chain. See `media.ytDlpFallbacks`.
 */
const YOUTUBE_CLIENTS = (
  process.env.YT_DLP_YOUTUBE_CLIENTS ?? "web_embedded,mweb,tv_simply"
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
  },
  llm: {
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 120000),
  },
  capture: {
    /**
     * Server-side browser the user drives to sign in to a social source
     * (SESSION_AUTH.md §2). Runs HEADFUL under Xvfb on Linux — Instagram
     * fingerprints `--headless=new` aggressively — and directly on a dev
     * machine that already has a display.
     */
    chromiumPath: process.env.CHROMIUM_PATH ?? "chromium",
    xvfbRunPath: process.env.XVFB_RUN_PATH ?? "xvfb-run",
    /**
     * Xvfb is a Linux thing. On Windows/macOS the launcher skips it and
     * uses the real display, so a developer can exercise capture without
     * a container. Auto-detected, overridable for the odd Linux box that
     * already has a display.
     */
    useXvfb: process.env.CAPTURE_USE_XVFB
      ? process.env.CAPTURE_USE_XVFB === "true"
      : process.platform === "linux",
    /** Own process, like the worker: Next.js route handlers cannot upgrade
     * a request to a WebSocket, and a live browser is long-lived state a
     * request handler cannot own (SESSION_AUTH.md §2.1). */
    port: Number(process.env.CAPTURE_PORT ?? 3002),
    /** Where the BROWSER connects. Must be reachable from the client. */
    publicUrl: process.env.CAPTURE_PUBLIC_URL ?? "ws://127.0.0.1:3002",
    /**
     * Where the NEXT.JS APP reaches the capture service's control plane.
     * Server-to-server, so in compose this is the service name — distinct
     * from `publicUrl`, which the end user's browser has to resolve.
     */
    internalUrl: process.env.CAPTURE_INTERNAL_URL ?? "http://127.0.0.1:3002",
    /**
     * Headful Chromium is ~300-500MB each and the deploy target is one
     * VPS. Two fits with headroom for a concurrent download + ffmpeg
     * spike; drop to 1 on a 2GB box.
     */
    maxConcurrent: Number(process.env.CAPTURE_MAX_CONCURRENT ?? 2),
    /** Hard ceiling. 2FA means fetching a code from a phone. */
    sessionTtlMs: Number(process.env.CAPTURE_SESSION_TTL_MS ?? 600_000),
    /** The real reclaimer — an abandoned tab must not hold 500MB. */
    idleTimeoutMs: Number(process.env.CAPTURE_IDLE_TIMEOUT_MS ?? 90_000),
    /** Ticket → WebSocket handshake is machine-speed. */
    ticketTtlMs: Number(process.env.CAPTURE_TICKET_TTL_MS ?? 60_000),
    viewport: { width: 1280, height: 800 },
    /**
     * No frame rate is configured on purpose: CDP's `screencastFrameAck`
     * IS the backpressure — the next frame is requested only once the
     * client acknowledges the last, so the stream self-throttles.
     */
    frame: { format: "jpeg", quality: 60 },
    /**
     * SECURITY DOWNGRADE, off by default. This browser renders third-party
     * pages, so disabling Chromium's sandbox puts a renderer exploit on the
     * host. Only turn it on where the container genuinely cannot run the
     * sandbox, and prefer fixing the container instead (run as non-root, or
     * give it the Chromium seccomp profile).
     */
    noSandbox: process.env.CAPTURE_NO_SANDBOX === "true",
    /**
     * Shared secret for the control endpoints the Next.js app calls on the
     * capture service (create / harvest / cancel).
     *
     * Loopback is not available here: app and capture are separate
     * containers, so those calls cross the compose network. Only `/stream`
     * is meant to be publicly reachable — the reverse proxy must not expose
     * the control paths, and this token is the second lock behind that.
     *
     * Defaults to the vault key so a single-host dev setup works with no
     * extra configuration, while still never being empty.
     */
    internalToken:
      process.env.CAPTURE_INTERNAL_TOKEN ?? process.env.VAULT_KEY ?? "",
    /**
     * Fallback for hosts where `shm_size` cannot be raised. Docker's default
     * 64MB /dev/shm makes Chromium tabs crash; `--disable-dev-shm-usage`
     * trades that for disk I/O. Prefer shm_size on the service.
     */
    smallShm: process.env.CAPTURE_SMALL_SHM === "true",
  },
  ollama: {
    /**
     * Local Ollama is a DEVELOPMENT convenience and is OFF by default.
     *
     * It is keyless, so if it were always registered it would be
     * "configured" on every deploy — including production, where nothing
     * is listening on 11434 — and every extraction would waste an attempt
     * failing to connect before falling through. Opt in explicitly.
     */
    localEnabled: process.env.OLLAMA_LOCAL_ENABLED === "true",
    localBaseUrl: process.env.OLLAMA_LOCAL_URL ?? "http://127.0.0.1:11434/v1",
    /**
     * Ollama Cloud speaks the same OpenAI-compatible surface as the local
     * server — verified 2026-09-01: GET /v1/models returns 200 with an
     * OpenAI-shaped list, POST /v1/chat/completions returns 401 without a
     * bearer token. So it needs no special client, only a key in the vault.
     */
    cloudBaseUrl: process.env.OLLAMA_CLOUD_URL ?? "https://ollama.com/v1",
    /**
     * Ollama's OpenAI-compat layer wants an Authorization header but
     * ignores its value locally (per Ollama's own docs, which pass the
     * literal "ollama"). Sending this placeholder keeps the keyless path
     * from having to special-case the shared HTTP client. NOT a secret.
     */
    localApiKey: "ollama",
    /**
     * Context window Ollama is SERVING, which is not the model's maximum.
     * Measured 2026-09-01: gemma4:12b advertises 262144, but a default
     * `ollama serve` loaded it at 4096 — too small for a transcript plus a
     * JSON schema. The server default is set by OLLAMA_CONTEXT_LENGTH, so
     * this value must be kept in step with it; it is what the ranker sees,
     * because Ollama's /v1/models advertises no context at all.
     */
    contextLength: Number(process.env.OLLAMA_CONTEXT_LENGTH ?? 32768),
  },
  cache: {
    prefix: "relay:cache",
    promptTtlSeconds: Number(process.env.CACHE_PROMPT_TTL ?? 3600),
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
    /**
     * Local log file, so all three processes (web, worker, capture) can be
     * read in one place without tailing three terminals.
     *
     * Inside `data/`, which is gitignored — logs are operational data, and
     * although this codebase never logs a secret (see the redaction list in
     * src/lib/observability/logger.ts), a log file is still not something to
     * commit. Set to "" to disable and log to stdout only.
     */
    logFile: process.env.LOG_FILE ?? "./data/logs/relay.log",
    /** Which process wrote a line — all three share the one file. */
    service: process.env.SERVICE_NAME ?? "relay-api",
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

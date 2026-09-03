const PORT = Number(process.env.PORT ?? 3000)
const BASE_URL = process.env.APP_BASE_URL ?? `http://localhost:${PORT}`

/**
 * yt-dlp `player_client` fallbacks, tried in order when the default chain
 * cannot get a downloadable format. Which clients YouTube serves is a
 * moving target, hence env-overridable.
 *
 * `web_safari` led this list until 2026-09-03, chosen because its HLS
 * formats needed no PO token. That stopped being true: measured from a
 * RESIDENTIAL connection on yt-dlp 2026.08.19, it failed 3 of 4 real
 * Shorts with "Requested format is not available" while `web_embedded`
 * and `mweb` took all 4. See LLM_STATE.md.
 */
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
    /**
     * How many runs ONE user may have executing at once, enforced by a
     * Dragonfly semaphore because BullMQ OSS has no job groups and its
     * `limiter` is global rather than per-key (SESSION_AUTH.md §5.4).
     *
     * Fairness is the visible benefit — with `concurrency: 2` global, one
     * user submitting 20 URLs would otherwise occupy both slots. But it is
     * also CORRECTNESS: two runs sharing one cookie jar both write the
     * rotated jar back on exit, and the loser's clobber can invalidate a
     * live session. Serializing per user serializes per credential, since
     * a credential belongs to exactly one user.
     *
     * ⚠ If this is ever raised above 1, the semaphore key MUST move from
     * the user id to the credential id for cookie-bearing runs, or that
     * clobber comes back.
     */
    perUserConcurrency: Number(process.env.QUEUE_PER_USER_CONCURRENCY ?? 1),
    /**
     * Crash-safety net on the semaphore, not a runtime budget: a worker
     * killed mid-run releases its slot by expiry instead of wedging that
     * user forever. Must exceed the longest plausible run — sized off the
     * 328.7 s worst case observed in LLM_STATE with a wide margin.
     */
    userSlotTtlMs: Number(process.env.QUEUE_USER_SLOT_TTL_MS ?? 1_800_000),
    /** How long a run waits before re-checking a busy user slot. */
    deferMs: Number(process.env.QUEUE_DEFER_MS ?? 2000),
  },
  llm: {
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 120000),
  },
  /**
   * Lifecycle of an imported social session once it is in use
   * (SESSION_AUTH.md §5.3, §5.5).
   */
  social: {
    /**
     * Consecutive SESSION_EXPIRED rejections before the Vault row offers
     * "Reconnect". Two, not one: a single transient checkpoint should not
     * nag a user whose session is in fact fine. Any success resets it.
     */
    staleAfterRejects: Number(process.env.SOCIAL_STALE_AFTER_REJECTS ?? 2),
    /**
     * Rolling-window download budget for ONE captured session, keyed on the
     * credential id rather than the user — the ACCOUNT is what gets
     * flagged, and a user could hold several (SESSION_AUTH.md §5.3).
     *
     * Each yt-dlp fetch is several requests; anonymous Instagram tolerates
     * low hundreds of requests/hour before throttling. 10 downloads/hour
     * keeps us about an order of magnitude under, and well inside what a
     * human browsing Reels generates.
     */
    ratePerHour: Number(process.env.SOCIAL_RATE_PER_HOUR ?? 10),
    /**
     * Catches the slow burn an hourly cap misses — 10/hr sustained would
     * be 240/day, which looks nothing like a person. 50/day is far more
     * than a curator saves, so it should never bind in practice; it exists
     * to stop a runaway loop.
     */
    ratePerDay: Number(process.env.SOCIAL_RATE_PER_DAY ?? 50),
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
     * Local log file, so both processes (web, worker) can be
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
    /**
     * The per-run log stream behind the run detail view's stage rail.
     *
     * Two sources, deliberately: Dragonfly holds the LIVE window (fast,
     * complete, expires on its own) and OpenObserve answers for anything
     * older (durable, costs no new storage because the logger already
     * ships there). Neither needed a migration, which is why the split
     * exists at all.
     */
    runLogs: {
      /**
       * Cap per run. Trimmed from the OLDEST end — a run that fails after
       * thousands of lines is diagnosed from its tail. Also the `size` of
       * the historical query, so one pathological run cannot return a
       * million rows into a request handler.
       */
      maxLines: Number(process.env.RUN_LOG_MAX_LINES ?? 500),
      /**
       * How long the live window lasts. A day covers "something just
       * broke, show me why", which is the whole use case; past that the
       * OpenObserve path takes over and the user sees no difference.
       */
      ttlSeconds: Number(process.env.RUN_LOG_TTL_SECONDS ?? 86400),
      /** How far back the historical query looks. */
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

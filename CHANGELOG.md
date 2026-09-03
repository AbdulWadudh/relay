# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### YouTube egress
- Routed YouTube fetches through a Cloudflare WARP egress, because YouTube refuses datacenter addresses and the deploy is a VPS. Measured from the production host against 12 real Shorts: 0/12 direct ("Sign in to confirm you're not a bot"), 11/12 through the proxy, 11/12 from a residential connection with byte-identical files. This closes the gap to residential rather than beating it. Opt-in is a `proxied` flag on the source registry resolved onto `ParsedSource` at parse time, so the download step decides by reading a boolean and still names no platform; YouTube only, Instagram stays direct.
- Treated `MEDIA_PROXY_URL` as a credential: yt-dlp echoes the proxy it was handed when it cannot reach it and that stderr reaches the user-visible `run.error`, so `scrubProxy` strips it at the single point stderr enters the program, `proxy` joined the logger's redaction words while the `proxied` boolean deliberately did not, and `bun run verify:proxy` pushes a canary password through five real failure shapes plus a log record.
- Moved the proxy from a standalone Coolify resource back into `docker-compose.yml` as the `warp` service. As a standalone resource it sat on Coolify's shared network while the app sat on its own, `--network` in Custom Docker Run Options is silently stripped, and the only thing making `socks5://warp:1080` resolve was a hand-run `docker network connect` that every redeploy of the proxy destroyed. It publishes no port (gost auto-detects HTTP as well as SOCKS5, so a published 1080 on a public VPS is an open relay), persists its device registration so the exit address survives a restart, and healthchecks the tunnel rather than the listener. Deliberately not in the worker's `depends_on`: only YouTube uses it, so gating the worker would stop Instagram ingestion whenever WARP is throttled.
- Rejected putting the app on Coolify's shared network instead — Dragonfly runs with an empty `requirepass`, so that would expose the job queue to every other container on the host.

### Media ingest reliability
- Bumped the pinned yt-dlp from `2026.03.17` to `2026.08.19`, which fixed a live outage rather than being hygiene: the old pin 403'd on the media fetch for roughly half of YouTube items — metadata resolved, then the CDN refused the stream. Those 403s reproduced from a residential connection too, which read as source-side and was written up as such; it was a stale extractor. A/B the version before concluding anything about a widespread 403.
- Classified a failed download on the most informative attempt rather than the last one. A YouTube fetch walks the default client then each configured fallback, and they do not fail in order of usefulness: a 403 from the default client followed by "Requested format is not available" from a later client was reported as an extractor problem, discarding the 403 that pointed at the stale pin. The ladder now runs against every attempt and the highest rung decides, with the patterns and their measurements split into `failure-patterns.ts` and the ladder into `classify.ts`.
- Made two classification guarantees structural instead of incidental: proxy-unreachable fires only for an attempt that actually used the proxy, and `SESSION_EXPIRED` requires that the attempt being classified supplied a cookie jar, recorded per attempt rather than read off the enclosing run.
- Stopped reporting a missing format as an expired session — "Requested format is not available" contains "not available" and fell into the login-shaped branch, telling users to reconnect a session that was working and burning a reject against a credential they had just refreshed.
- Stopped reporting a bot challenge as a dead session, for the same reason: a cookie jar cannot answer a challenge aimed at the server's address.
- Exhausted the player-client chain on a client-shaped failure, and picked clients that can actually serve our format selector — the previous list led with one that cannot satisfy `bestaudio/best` at all.

### Run logs
- Added a per-stage log stream to the run detail rail, collapsed by default and fetched only when expanded, so a page view that never opens a stage costs no log traffic.
- Split storage by lifetime rather than adding any: the live window is a capped, TTL'd list in Dragonfly, and once that expires the same lines are read back out of OpenObserve, which the logger already ships to. `source` tells the UI which it got, so an empty panel can say why it is empty. Neither path needed a migration.
- Redacted run log fields at the point they enter the live stream, because these lines are rendered in the product — a withheld value shows as the literal `[REDACTED]` rather than being silently dropped.

### Interface
- Made the stage log panel follow the theme. It hardcoded `bg-zinc-950` — the only fixed-dark surface outside the modal scrims — while its empty state correctly used a theme token, so in light mode the panel stayed black and the text vanished into it. Chose `bg-card` over `bg-muted` by measuring the token values: the metadata pair is 4.39:1 on light `--muted`, under the 4.5 bar that applies at 11px, and 4.83:1 on light `--card`.
- Unified list pages on one structure across runs, agents and vault, where only one element scrolls and it is never the page.
- Paginated the queue with the page in the URL, scrolled table rows under a sticky header, and pinned the pager to the bottom of the scroll area.
- Added re-running a finished source from either the row or the detail page.
- Clamped the dialog grid's column track, not only its rows, and composed the shared Modal across the vault so dialog widths stopped going edge-to-edge.

### Sessions and the vault
- Replaced the capture browser with cookie import and dropped instaloader, removing Python and ~120MB from the image: with the user's own jar, yt-dlp reaches Instagram Reels, and the caption it puts in `description` is exactly what instaloader's title was built from.
- Added a guided step-by-step connect wizard and a user guide, reconnecting from any session row, and a mobile path for the export.
- Fixed the export instructions: made the sequence explicit, said "same tab" rather than "same browser", made the sign-in URL copyable, and told users to allow the extension in private windows.

### Documentation
- Pointed AGENTS.md at RULES.md, which nothing had referenced.
- Scrubbed host details from the runbook and narrowed it to the current state; the repo is public, so addresses, key names and resource UUIDs stay out of it.
### Tooling
- Mapped the repo into a graphify knowledge graph so structural questions are answered by traversal instead of reading source into context — measured ~12x fewer tokens per question. Installed with the `[sql]` extra after the first pass warned that all 7 `drizzle/*.sql` migrations had contributed nothing to the graph; the extra recovered the schema. Usage documented in AGENTS.md, README and RULES.
- Committed the graph itself (`graphify-out/`, ~2.3MB: graph, semantic cache, manifest, community labels, audit report) rather than gitignoring it, so a fresh clone queries it with no rebuild and no clone re-spends the ~316k-token doc extraction. Every committed artefact is path-relative; only the machine-local sidecars, the per-machine cost ledger, and the regenerable 1.5MB `graph.html` are ignored.

### Task 4.4–4.6: Extraction, Grounding & Notion Publishing
- Seeded Recipe and Location system agents per user and added agent routing: requested agent → user agent → system agent → a synthesized schema for an unseen category, with the agent-builder writing the new agent's prompt.
- Added a database-backed, Redis-cached model catalog and prompt store; both revalidate on modification, and no model id or prompt is hardcoded.
- Validated every model response against the routed agent's JSON Schema with one repair retry that feeds the validation errors back, parsing through `best-effort-json-parser`.
- Replaced per-property evidence citations with transcript-and-caption grounding: each extracted claim is scored on content-word overlap against the source and flagged, never silently dropped.
- Rendered extractions to a structured document tree and published it into the Notion `Guides` hierarchy — category row with emoji, inline entries database, and the page itself — using `@notionhq/client`.
- Added a Prompts dashboard, a reusable Modal, `json-edit-react` JSON panels, explicit Clone semantics for system agents, and instaloader-backed Instagram ingestion.
- Fixed the extraction prompt dropping the post caption: it was accepted as an input but never sent to the model, despite the agent prompts instructing it to read the caption.

### Deployment
- Split the Dockerfile into `deps`/`builder`/`runtime` stages so build-only artefacts stay out of the shipped image, and pinned the base to the Bun version this repo is developed against (the floating `oven/bun:1` tag had moved to a different minor than local development).
- Fixed the `worker` service recompiling the entire Next.js app on every deploy: it omitted the `NEXT_PUBLIC_*` build args that `relay` passes, and those are baked into `ENV`, so its build never matched the cache. Measured 16.4s of duplicated compilation, now a 3s cache hit.
- Moved dependency installation above the build-arg block so bumping a public version string no longer reinstalls dependencies.
- Added an `init` process to the worker container so yt-dlp, ffmpeg and instaloader children are reaped, a loopback liveness endpoint so Coolify can report worker health, log rotation on every service, and a pinned Dragonfly image in place of `:latest`.

### Authentication & Observability
- Added Better Auth email/password and Google sign-in backed by one `auth_users` table, with session, account, and verification persistence.
- Scoped credentials and agents to the authenticated user with cascading ownership foreign keys.
- Added public Privacy Policy, Terms of Service, and branded sign-in pages.
- Replaced the server logger with Pino and added OpenObserve browser RUM and logs with Coolify build-time public configuration.
- Rebranded connected integrations as Rays; provider authorization now uses `/api/v1/rays/oauth/:provider` and its callback.

## [0.3.0] - 2026-08-29
### Deployment
- Added production Docker and Docker Compose configuration for Coolify, including persistent SQLite storage and runtime environment variable wiring.
- Created the `relay` environment under the Coolify `Apps` project.
- Added the SQLite driver required by Drizzle Kit and a containerized Drizzle Studio service on port `4983`.
- Switched the remote database browser to Drizzle Gateway, with read-only access to the Relay SQLite volume.
- Configured Coolify to require and inject the Drizzle Gateway master password through `STUDIO_PASSWORD`.
- Aligned the Studio service with Coolify's Gateway pattern: pinned image, generated port-qualified FQDN, persistent store, and required password.

## [0.2.0] - 2026-08-29
### Task 2: Credentials Dashboard & Notion Ray
- Encrypted credentials vault service with single-tenant user bootstrap; masked API (`GET/POST /api/v1/credentials`, `DELETE /:id`) and Notion Ray flow (`/api/v1/rays/oauth/notion` + callback) with CSRF state cookie.
- Fixed-viewport dashboard shell (root never scrolls) with sidebar navigation; `/vault` page: credentials table, add-key dialog, delete confirmation, Ray result toasts — ShadCN + HugeIcons throughout.
- New rules: design-taste-frontend + gpt-taste for all UI, 250-line file cap, agent-browser for browser work.

## [0.1.0] - 2026-08-29
### Task 1: Foundation & Database
- Scaffolded Next.js App Router + Tailwind v4 + ShadCN (preset `b5pFrsf5Vq`: mira/zinc/emerald, HugeIcons, RTL) under Bun with a `src/` layout.
- Emerald-on-Zinc OKLCH dark theme (default dark), Oxanium headings, Space Grotesk body, JetBrains Mono monospace.
- `bun:sqlite` database with `users`, hybrid encrypted/plaintext `credentials` (AES-256-GCM tokens, plaintext `meta_data`, indexed `expires_at`), and `agents` tables.
- AES-256-GCM crypto utilities with per-record IVs and tamper detection.
- OpenObserve observability: batched server log pipeline + Hono request middleware, client RUM (page loads, errors) proxied via `/api/v1/telemetry`, Hono API mounted at `/api/v1/*`.
- Toolchain: Biome for lint/format (replacing ESLint/Prettier), `tsc --noEmit` for typechecking, all scripts on the Bun runtime.

### Initial Setup
- Initialized system specs: PRD, TRD, Agent Rules, Design Guidelines, and Branding configuration for Relay.

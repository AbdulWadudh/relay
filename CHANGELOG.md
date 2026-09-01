# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
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

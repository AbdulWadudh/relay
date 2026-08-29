# LLM Execution State - Relay

- **Current Phase:** AWAITING HUMAN APPROVAL — Task 2 complete, ready to begin Task 3 (Agent Management System) upon approval. Open human decision: whether to adopt better-auth (analysis delivered 2026-08-29; recommendation: keep hand-rolled vault OAuth until multi-user auth is needed).
- **Completed Phases:** PRD, TRD, Agent Rules, Design Guidelines, Branding, **Task 1: Foundation & Database**, **Task 2: Credentials Dashboard & Notion OAuth**

## Task 2 Completion Notes (2026-08-29)

- **Vault service** `src/lib/vault.ts`: create/list/delete credentials + `getAccessToken`; single-tenant local user bootstrap (`users` row `local`). Refresh tokens stored self-contained as `ivHex:cipherB64` (GCM IVs must never be reused; TRD's single `iv` column serves the access token).
- **API**: `GET/POST /api/v1/credentials`, `DELETE /api/v1/credentials/:id` (Zod-validated, masked responses); `GET /api/v1/oauth/notion` + `/callback` (state cookie CSRF, token exchange, encrypted persist, redirect to /vault with `?connected`/`?error`).
- **Config**: `config.notion` section (NOTION_CLIENT_ID/SECRET env vars).
- **UI**: fixed-viewport app shell (`src/components/app-shell.tsx`, root never scrolls — only ShellContent scrolls); `(dashboard)` route group; `/vault` page with credentials table, empty state, Add API Key dialog (ShadCN Field/Select/Input), delete confirmation, toasts; Connect Notion disabled with hint until OAuth env is set. Built under design-taste-frontend + gpt-taste constraints; all authored files < 250 lines.
- **QA (agent-browser)**: add-key → encrypted row → delete round-trip verified in the running app; Select label bug and unconfigured-Notion UX fixed from findings.
- **Gotchas fixed**: user-added `NODE_ENV=development` in `.env.local` broke `next build` (removed — Next manages NODE_ENV); stale HMR global renamed to `__relayDrizzle`; Biome override for vendored `src/components/ui/**`.
- **Active Circuit Breakers:** See `RULES.md` (canonical) — max 3 files/step, `bun run typecheck` 0 errors, commit + STOP per task, no ghost dependencies, **Bun-first: Bun-native/Web-standard APIs only; `node:*` compat only where Bun ships no equivalent, with justifying comment; raw `bun:sqlite`, no ORM.**

## Task 1 Completion Notes (2026-08-29)

- **Scaffold:** `bunx --bun shadcn@latest init --preset b5pFrsf5Vq --template next --rtl --pointer` (mira style, zinc base, emerald theme, hugeicons, RTL, pointer). Project uses a `src/` directory layout per human instruction.
- **Toolchain (human-directed mid-task):** Biome replaces ESLint + Prettier (`bun run lint`, `bun run format`). `tsc --noEmit` retained solely for the typecheck gate (Biome does not type-check). All scripts run Next via `bun --bun` so `bun:sqlite` is available.
- **Theme:** Emerald-on-Zinc OKLCH variables in `src/app/globals.css`; dark mode default; Oxanium on `h1–h4` via `--font-heading`; Space Grotesk body; JetBrains Mono for `--font-mono`.
- **Database:** `src/lib/db/index.ts` — `bun:sqlite`, WAL, FK on; `users`, `credentials` (hybrid: AES-256-GCM `access_token`/`refresh_token` + plaintext `meta_data` JSON, indexed `expires_at` and `(user_id, provider)`), `agents` per TRD §2.
- **Crypto:** `src/lib/crypto.ts` — AES-256-GCM, unique 96-bit IV per record, auth tag appended to base64 ciphertext, key from `MASTER_ENCRYPTION_KEY` (generated into `.env.local`, gitignored).
- **Observability:** `src/lib/observability/logger.ts` (batched OpenObserve ingest + Hono middleware, console fallback when unconfigured), `src/lib/observability/client.ts` (RUM: page loads, errors, interactions), `/api/v1/telemetry` proxy keeps OpenObserve credentials server-side. Hono mounted at `src/app/api/v1/[[...route]]/route.ts` with `/api/v1/health`.
- **Dependencies added (required by Task 1 spec):** `hono`, `@types/bun` (dev), `@biomejs/biome` (dev). Removed: `eslint`, `eslint-config-next`, `prettier`, `prettier-plugin-tailwindcss`.
- **Verification:** `bun run typecheck` = 0 errors; `biome check` clean; `bun run build` succeeds; `bun scripts/smoke-test.ts` — tables/indexes created, crypto roundtrip OK, IV uniqueness OK, tamper detection OK.

## Post-Task-1 Amendments (2026-08-29, human-directed)

- **Drizzle ORM adopted** (reverses earlier no-ORM ruling): schema in `src/lib/db/schema.ts`, `drizzle-orm/bun-sqlite` driver, migrations in `drizzle/` via `bun run db:generate`, applied automatically on connection.
- **Zod validation** at all API boundaries; shared schemas in `src/lib/schemas.ts`.
- **`src/config/index.ts` is the single source of ALL configuration** — no `process.env` reads elsewhere. Vault key env var is `VAULT_KEY` (user-chosen name); DB URL from `DATABASE_URL` (default `file:./local.db`).
- **Brand assets** generated to `public/relay_x32.ico` + `public/relay_x512.webp` (ffmpeg) and wired via `config.assets` in layout metadata; no icon files in `src/app`.
- README rewritten with setup/scripts/layout documentation.

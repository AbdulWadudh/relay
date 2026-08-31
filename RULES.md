# Agent Execution Rules - Relay

## Circuit Breakers
- Max 3 files modified per execution step.
- Must run `bun run typecheck` with 0 errors before presenting completion.
- Must update `LLM_STATE.md` and **STOP** for human approval after completing each task.
- **NEVER commit without explicit human approval** — human decision 2026-08-29. Present the changes, wait for the go.
- No ghost dependencies (`bun add` or `npm install`) without explicit human clearance.
- **No hardcoding** — human decision 2026-08-29. Provider ids/labels live only in `src/lib/providers.ts`; env-derived values only in `src/config`; types derive from the single source. MVP-first: minimal entries, scalable machinery.

## Bun-first (MANDATORY)
- **Bun runs everything.** Never invoke Node, npm, npx, or Node-installed binaries. Use `bun`, `bun run`, `bunx --bun`. Package scripts must run Next via `bun --bun` so Bun-native APIs (`bun:sqlite`, `Bun.$`) are available at runtime.
- **Prefer Bun-native and Web-standard APIs over `node:*` compat modules:**
  - Crypto: WebCrypto (`crypto.subtle`, `crypto.getRandomValues`) — not `node:crypto`.
  - Encoding: native `Uint8Array` `.toHex()`/`.toBase64()`/`fromHex()`/`fromBase64()`, `btoa`/`atob`, `TextEncoder`/`TextDecoder` — not `Buffer`.
  - SQLite: **Drizzle ORM over the libSQL driver** (`drizzle-orm/libsql` + `@libsql/client`) — human decision 2026-08-31 (supersedes the earlier `drizzle-orm/bun-sqlite` decision of 2026-08-29). `config.database.url` is a local `file:` path in dev and a remote Turso `libsql://` URL in production, both via the same client. Schema lives in `src/lib/db/schema.ts`; migrations generated via `bun run db:generate` and applied via the explicit `bun run db:migrate` step (Dockerfile CMD runs it before `next start`) — not automatically on connection, because libsql's migrator is async while `getDb()` is called synchronously throughout the codebase, and auto-migrating per-connection let concurrent Next.js build workers race to migrate the same database.
  - Shell/processes: `Bun.$` — not `child_process`.
  - Files: `Bun.file` / `Bun.write` where async is acceptable.
- **Narrow exception:** a `node:*` import is allowed only when Bun ships no native or Web-standard equivalent (e.g. `node:stream` in `src/lib/observability/logger.ts`, required by `pino`).

## Configuration (MANDATORY)
- **`src/config/index.ts` is the single source of ALL configuration across the app** — human decision 2026-08-29. App identity, server, API version, database URL, vault key, asset paths, theme, and observability all flow through the exported `config` object.
- **Never read `process.env` anywhere else.** New env vars must be added to the config object (and `.env.example`) and consumed via `import config from "@/config"`.
- No hardcoded app names, versions, ports, URLs, stream names, or asset paths outside the config module.

## Validation (MANDATORY)
- **Zod validates all external input at the API boundary** (request bodies, query params, Ray callbacks) before it touches the database or vault — human decision 2026-08-29. Shared schemas live in `src/lib/schemas.ts`.

## Toolchain
- **Biome** for lint + format (`bun run lint`, `bun run format`). ESLint and Prettier are banned.
- `tsc --noEmit` is retained **only** for the typecheck gate (Biome does not type-check; Bun has no typechecker).

## UI
- Only dedicated ShadCN components. Native `<input>`, `<select>`, `<textarea>`, `<button>` are forbidden.
- HugeIcons only (no Lucide). Oxanium headings, Space Grotesk body, JetBrains Mono for code.
- `src/` directory layout: `src/app`, `src/components`, `src/lib`, `src/hooks`.
- **Design skills (MANDATORY, human decision 2026-08-29):** every website/page/section build runs through the `design-taste-frontend`, `gpt-taste`, `ui-styling`, and `ui-ux-pro-max` skills — no templated/generic AI-slop layouts.
- **Vivid UI (MANDATORY, human decision 2026-08-29):** no dead/static surfaces. Use colors and animations heavily — every interactive icon/button action has its OWN unique hover accent color (not one global accent), plus motion feedback (scale/translate/glow transitions). Entrance animations on panels/lists.
- **Living app motion (human decision 2026-08-29):** app-level state changes use the **View Transitions API** (e.g. the theme switch's circular page-peel from the click point; route transitions later). Element-level motion uses micro-interactions, staggered orchestration, and shared-element/FLIP transitions. Every big state change should feel physical, never a hard swap. Always gate behind `prefers-reduced-motion`.
- **Generous scale (MANDATORY, human decision 2026-08-29):** this is a desktop command center — use the screen space. No cramped micro-UI: buttons ≥ h-9 with text-sm, inputs ≥ h-10, table rows with real padding (px-4 py-3+), page headers h-16 with text-lg+ titles, content padding p-8, dialogs sized to their content (wide grids get max-w-2xl+), icon tiles and icons scaled up. When in doubt, go larger.
- **Brand logo:** always the PNG asset (`config.assets.logo`), and it always links to the home page.
- **Layout primitives (human decision 2026-08-29):** app chrome uses the ShadCN `Sidebar` (sidebar-07 pattern, icon-collapsible, with `NavUser` profile footer); scrollable panels use ShadCN `ScrollArea` (never raw `overflow-y-auto` divs); multi-pane workbenches use ShadCN `Resizable` panels.
- **Solid surfaces only (human decision 2026-08-29):** no glass/translucent effects — no `backdrop-blur`, no `bg-popover/70`-style translucent popups. Menus, selects, dialogs are solid `bg-popover`; modal scrims dim without blurring.
- **Row-scoped actions:** operations on an existing record (reconnect, delete) live in that record's table row, not in the page header; the header holds only creation/first-time actions.
- **Fixed-viewport shell:** the root viewport NEVER scrolls — `overflow-hidden` on the document root and app shell. Only designated inner panels (`overflow-y-auto`) scroll.
- **Browser work:** always use `agent-browser` for any browser automation, QA, or screenshotting — never other browser tools.

## Code Hygiene
- **Max 250 lines per file.** Split modules/components before they cross it.
- **Backend naming:** there is exactly ONE Hono app (mounted in `src/app/api/v1/[[...route]]/route.ts`). Everything under `src/server/` is a *module* (`credentialsModule`, `raysModule`, ...) — never name sub-routers "app".
- **Rays are provider-generic:** flows go through the registry in `src/server/ray-providers.ts` (`/rays/oauth/:provider`); no provider-specific routes, cookies, or hardcoded provider strings in flow logic.
- **Provider-specific concepts NEVER leak into common files** (human decision 2026-08-29): registry entries map provider vocabulary (e.g. Notion's workspace) onto the generic `account_id` / `account_name` / `account_email` / `account_avatar` meta keys; the vault, routes, and UI consume ONLY the generic keys.

## Security
- `access_token` / `refresh_token` always AES-256-GCM encrypted with a unique IV per record; `meta_data` stays plaintext JSON.
- Tokens, keys, and request bodies are never logged.

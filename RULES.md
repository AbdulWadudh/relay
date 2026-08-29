# Agent Execution Rules - Relay

## Circuit Breakers
- Max 3 files modified per execution step.
- Must run `bun run typecheck` with 0 errors before presenting completion.
- Must update `LLM_STATE.md`, commit code locally, and **STOP** for human approval after completing each task.
- No ghost dependencies (`bun add` or `npm install`) without explicit human clearance.

## Bun-first (MANDATORY)
- **Bun runs everything.** Never invoke Node, npm, npx, or Node-installed binaries. Use `bun`, `bun run`, `bunx --bun`. Package scripts must run Next via `bun --bun` so Bun-native APIs (`bun:sqlite`, `Bun.$`) are available at runtime.
- **Prefer Bun-native and Web-standard APIs over `node:*` compat modules:**
  - Crypto: WebCrypto (`crypto.subtle`, `crypto.getRandomValues`) — not `node:crypto`.
  - Encoding: native `Uint8Array` `.toHex()`/`.toBase64()`/`fromHex()`/`fromBase64()`, `btoa`/`atob`, `TextEncoder`/`TextDecoder` — not `Buffer`.
  - SQLite: **Drizzle ORM over the `bun:sqlite` driver** (`drizzle-orm/bun-sqlite`) — human decision 2026-08-29 (supersedes the earlier no-ORM ruling). Schema lives in `src/lib/db/schema.ts`; migrations via `bun run db:generate` / applied automatically on connection.
  - Shell/processes: `Bun.$` — not `child_process`.
  - Files: `Bun.file` / `Bun.write` where async is acceptable.
- **Narrow exception:** a `node:*` import is allowed only when Bun ships no native or Web-standard equivalent (e.g. synchronous `mkdirSync`/`dirname` in `src/lib/db/index.ts`).

## Configuration (MANDATORY)
- **`src/config/index.ts` is the single source of ALL configuration across the app** — human decision 2026-08-29. App identity, server, API version, database URL, vault key, asset paths, theme, and observability all flow through the exported `config` object.
- **Never read `process.env` anywhere else.** New env vars must be added to the config object (and `.env.example`) and consumed via `import config from "@/config"`.
- No hardcoded app names, versions, ports, URLs, stream names, or asset paths outside the config module.

## Validation (MANDATORY)
- **Zod validates all external input at the API boundary** (request bodies, query params, OAuth callbacks) before it touches the database or vault — human decision 2026-08-29. Shared schemas live in `src/lib/schemas.ts`.

## Toolchain
- **Biome** for lint + format (`bun run lint`, `bun run format`). ESLint and Prettier are banned.
- `tsc --noEmit` is retained **only** for the typecheck gate (Biome does not type-check; Bun has no typechecker).

## UI
- Only dedicated ShadCN components. Native `<input>`, `<select>`, `<textarea>`, `<button>` are forbidden.
- HugeIcons only (no Lucide). Oxanium headings, Space Grotesk body, JetBrains Mono for code.
- `src/` directory layout: `src/app`, `src/components`, `src/lib`, `src/hooks`.
- **Design skills (MANDATORY, human decision 2026-08-29):** every website/page/section build runs through the `design-taste-frontend` and `gpt-taste` skills — no templated/generic AI-slop layouts.
- **Fixed-viewport shell:** the root viewport NEVER scrolls — `overflow-hidden` on the document root and app shell. Only designated inner panels (`overflow-y-auto`) scroll.
- **Browser work:** always use `agent-browser` for any browser automation, QA, or screenshotting — never other browser tools.

## Code Hygiene
- **Max 250 lines per file.** Split modules/components before they cross it.
- **Backend naming:** there is exactly ONE Hono app (mounted in `src/app/api/v1/[[...route]]/route.ts`). Everything under `src/server/` is a *module* (`credentialsModule`, `oauthModule`, ...) — never name sub-routers "app".
- **OAuth is provider-generic:** flows go through the registry in `src/server/oauth-providers.ts` (`/oauth/:provider`); no provider-specific routes, cookies, or hardcoded provider strings in flow logic.

## Security
- `access_token` / `refresh_token` always AES-256-GCM encrypted with a unique IV per record; `meta_data` stays plaintext JSON.
- Tokens, keys, and request bodies are never logged.

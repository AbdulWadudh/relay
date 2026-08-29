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
- **Narrow exception:** a `node:*` import is allowed only when Bun ships no native or Web-standard equivalent (e.g. synchronous `mkdirSync`/`dirname` in `src/lib/db/index.ts`). Bun implements `node:*` modules natively in Zig — no Node.js binary is involved — but every such import must carry a justifying comment referencing this rule.

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

## Security
- `access_token` / `refresh_token` always AES-256-GCM encrypted with a unique IV per record; `meta_data` stays plaintext JSON.
- Tokens, keys, and request bodies are never logged.

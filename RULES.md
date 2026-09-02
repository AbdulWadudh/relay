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
- **graphify knowledge graph (human decision 2026-09-02):** structural questions about this codebase — what calls X, what a change touches, how two modules connect — are answered from `graphify-out/graph.json` via `graphify explain` / `path` / `query` before grepping or reading files. The graph is a snapshot: the source always wins on disagreement, and `graphify update .` runs after landing code (AST only, no API key; a `.md` edit needs `/graphify . --update` instead, since the CLI refreshes code only). Installed with the `[sql]` extra (`uv tool install "graphifyy[sql]"`) — without it the `drizzle/*.sql` migrations are dropped from the graph with only a warning. **`graphify-out/` is committed** (graph, cache, manifest, labels, report — all path-relative and portable) so the graph is a shared asset and no clone re-spends the doc extraction; only machine-local sidecars, `cost.json` and the regenerable `graph.html` are ignored. A refresh is therefore a tracked diff — commit it with the change that caused it, and do not install the post-commit rebuild hook, which fires after the commit and leaves the graph permanently dirty. See AGENTS.md and README.

## UI
- Only dedicated ShadCN components. Native `<input>`, `<select>`, `<textarea>`, `<button>` are forbidden.
- HugeIcons only (no Lucide). Oxanium headings, Space Grotesk body, JetBrains Mono for code.
- `src/` directory layout: `src/app`, `src/components`, `src/lib`, `src/hooks`.
- **Design skills (MANDATORY, human decision 2026-08-29):** every website/page/section build runs through the `design-taste-frontend`, `gpt-taste`, `ui-styling`, and `ui-ux-pro-max` skills — no templated/generic AI-slop layouts.
- **Vivid UI (MANDATORY, human decision 2026-08-29):** no dead/static surfaces. Use colors and animations heavily — every interactive icon/button action has its OWN unique hover accent color (not one global accent), plus motion feedback (scale/translate transitions). Entrance animations on panels/lists.
- **Living app motion (human decision 2026-08-29):** app-level state changes use the **View Transitions API** (e.g. the theme switch's circular page-peel from the click point; route transitions later). Element-level motion uses micro-interactions, staggered orchestration, and shared-element/FLIP transitions. Every big state change should feel physical, never a hard swap. Always gate behind `prefers-reduced-motion`.
- **Generous scale (MANDATORY, human decision 2026-08-29):** this is a desktop command center — use the screen space. No cramped micro-UI: buttons ≥ h-9 with text-sm, inputs ≥ h-10, table rows with real padding (px-4 py-3+), page headers h-16 with text-lg+ titles, content padding p-8, dialogs sized to their content (wide grids get max-w-2xl+), icon tiles and icons scaled up. When in doubt, go larger.
- **Brand logo:** always the PNG asset (`config.assets.logo`). On public pages it links to the marketing home (`/`); inside the `(dashboard)` shell it links to the app's own home (`/runs`) — human decision 2026-08-31, home moved from `/vault` to `/runs` on 2026-09-01, a signed-in user clicking the logo should never get bounced out to the marketing page.
- **Light mode + mobile are first-class (MANDATORY, human decision 2026-08-31):** this product is used mostly on mobile, and dark mode is the default but light mode is not an afterthought. Before calling UI work done:
  - **Light mode contrast:** Tailwind's `-300`/`-200` text shades (`text-emerald-300`, `text-violet-300`, ...) read fine on this app's near-black dark surfaces but wash out or become illegible on light surfaces. Never ship one of these shades unconditionally on a tinted background — pair it with a `dark:` variant and a light-mode-appropriate darker shade instead, e.g. `text-emerald-700 dark:text-emerald-300`, not bare `text-emerald-300`. Same applies to glow/gradient washes: a full-panel `bg-[radial-gradient(...)]` that reads as ambient in dark mode can show up as a hard-edged smear on white — contain gradients inside a fixed-size, `overflow-hidden` element instead of spreading them across a whole panel.
  - **CSS specificity with `data-active`/`data-state`-driven primitives:** ShadCN/Base UI components (e.g. `SidebarMenuButton`) bake their own `data-active:` (or similar) variants into their base class string. An unconditional utility class passed in from the outside (`text-emerald-300`) has *lower* specificity than that baked-in `data-active:text-*` and silently loses, even though it appears later in the DOM's `className`. If you're styling an "active"/"selected" state on a component that already has its own data-attribute-driven styling, express your override with the matching `data-active:`/`data-[state=...]:` prefix (not a plain class, and not an arbitrary-value selector like `data-[active=true]:` unless you've confirmed the attribute's actual value) so it merges into the same utility group and wins.
  - **Mobile viewport:** resize to a small viewport (~390×844) and confirm layout, the sidebar's off-canvas collapse, text wrapping, and touch targets hold up. The "generous scale, desktop command center" language above does not exempt mobile from being checked.
  - Verify both with `agent-browser` (`set viewport ...`, and toggle theme) before presenting work as done — don't infer from the dark-mode desktop screenshot alone.
- **Layout primitives (human decision 2026-08-29):** app chrome uses the ShadCN `Sidebar` (sidebar-07 pattern, icon-collapsible, with `NavUser` profile footer); scrollable panels use ShadCN `ScrollArea` (never raw `overflow-y-auto` divs); multi-pane workbenches use ShadCN `Resizable` panels.
- **Solid colors only, no glass (MANDATORY, human decision 2026-08-31):** no translucent tints (`bg-emerald-500/10`), no blurred glow shadows (`shadow-[0_0_20px_...]`), no `backdrop-blur`. Hover/active accents and badges use a solid color fill (`bg-emerald-600 text-white`), not an opacity fraction over the background.
- **Layout must not dance while loading (MANDATORY, human decision 2026-08-31):** nothing may change position between the loading state and the fully loaded state — only the content itself updates. A skeleton mirrors the real component's structure and reserves every element's height (status bars, headers, chrome), rather than being a generic block. Anything that appears only after mount (relative timestamps, client-only values) renders a same-sized placeholder in the meantime.
- **Row-scoped actions:** operations on an existing record (reconnect, delete) live in that record's table row, not in the page header; the header holds only creation/first-time actions.
- **Fixed-viewport shell (dashboard workbench only):** inside the `(dashboard)` route group, the shell never scrolls — `h-svh overflow-hidden` on `SidebarInset` (`src/app/(dashboard)/layout.tsx`). Only the designated inner panel (`ShellContent`'s `ScrollArea`, `src/components/app-shell.tsx`) scrolls. Public pages (landing, login, privacy, terms) are NOT part of this shell and scroll normally via the browser's native document scroll — don't apply `overflow-y-auto`/`overflow-hidden` to `html`/`body` globally, or public pages get a nested double-scrollbar (setting overflow-y on both html and body disables the browser's html→body scroll propagation).
- **List pages: one structure, and only ONE thing scrolls (MANDATORY, human decision 2026-09-02).** Every page whose body is a list — runs, agents, credentials — is built the same way, from `src/components/app-shell.tsx`, `src/components/scroll-panel.tsx` and `src/components/data-table.tsx`:

  ```tsx
  <ShellContent fill>                                  {/* page does NOT scroll */}
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6">
      <ThingTable />                                   {/* flex min-h-0 flex-1 flex-col gap-2 */}
    </div>
  </ShellContent>
  ```

  - **`<ShellContent fill>` for a list; plain `<ShellContent>` for a document.** `fill` renders a fixed-height flex column and no ScrollArea, so the page cannot scroll; the default keeps the scrolling body a run detail or a settings form needs. A list page with the scrolling variant produces **two scrollbars side by side**, which is the bug this rule exists to prevent.
  - **Never size the panel with a height calculation.** The first attempt used `calc(100svh - 14.875rem)`, reverse-engineered by measuring the chrome above and below it on one viewport. It broke the moment anything else changed height. `SidebarInset` is already `h-svh` with a `shrink-0` header, so `flex-1` yields the exact remaining height at every viewport with nothing to keep in sync.
  - **`min-h-0` on every flex ancestor of the scroller.** A flex item defaults to `min-height:auto` and refuses to shrink below its content, so one missing `min-h-0` pushes the list past the screen and the overflow reappears on the page.
  - **A short list must not stretch its border.** `ScrollPanel` is deliberately two boxes: an outer one that *claims* the leftover height and draws nothing, and an inner one sized by its content and merely *capped* at that leftover. One box cannot do both — `flex-1` alone left 755px of empty bordered space under the Vault's six credentials, and `max-h-full` alone caps against the whole column (siblings included) so a long list pushes the pager off-screen.
  - **Tables go through `DataTable`.** A column declares its width once; `className` lands on the `th` and the `td` together, so a `w-20` or a `hidden lg:table-cell` cannot drift between them. Per-cell presentation goes in `cellClassName`.
  - **The sticky header goes on the `th`, never the `thead`** (`STICKY_TABLE_HEADER`). Preflight sets `border-collapse: collapse`, so a collapsed table's row borders belong to the table — a sticky `thead` drops its bottom border the moment it detaches and bleeds into the first row. The cells carry an opaque fill and an inset shadow instead.
  - **The `Table` primitive's container must be neutralised** (`[&_[data-slot=table-container]]:overflow-visible`, already inside `ScrollPanel`). It ships `overflow-y-hidden`, which makes that div the Y-axis scrollport, and a sticky `th` would stick to *it* and sit motionless while the rows moved behind it.
  - **No separator between the panel and the pager.** The panel is a bordered box; its bottom edge already divides them, and adding `border-t` to the pager stacks a second line under the first.
  - Mobile card lists use the same `ScrollPanel` with `bordered={false}`, so the "only one thing scrolls" contract holds below `lg` too.

- **Browser work:** always use `agent-browser` for any browser automation, QA, or screenshotting — never other browser tools.

## Code Hygiene
- **Max 250 lines per file.** Split modules/components before they cross it.
- **Backend naming:** there is exactly ONE Hono app (mounted in `src/app/api/v1/[[...route]]/route.ts`). Everything under `src/server/` is a *module* (`credentialsModule`, `raysModule`, ...) — never name sub-routers "app".
- **Rays are provider-generic:** flows go through the registry in `src/server/ray-providers.ts` (`/rays/oauth/:provider`); no provider-specific routes, cookies, or hardcoded provider strings in flow logic.
- **Provider-specific concepts NEVER leak into common files** (human decision 2026-08-29): registry entries map provider vocabulary (e.g. Notion's workspace) onto the generic `account_id` / `account_name` / `account_email` / `account_avatar` meta keys; the vault, routes, and UI consume ONLY the generic keys.

## Security
- `access_token` / `refresh_token` always AES-256-GCM encrypted with a unique IV per record; `meta_data` stays plaintext JSON.
- Tokens, keys, and request bodies are never logged.

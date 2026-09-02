# Graph Report - relay  (2026-09-02)

## Corpus Check
- 232 files · ~131,451 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1545 nodes · 3656 edges · 106 communities (65 shown, 39 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a4973017`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- agents-table.tsx
- cn
- query/credentials.ts
- sources.ts
- profile-card.tsx
- lib/providers.ts
- scripts
- schemas.ts
- transcription/index.ts
- biome.json
- utils.ts
- query/agents.ts
- nav-user.tsx
- compilerOptions
- vault.ts
- edit-credential-dialog.tsx
- chat.ts
- extraction/route.ts
- ingest.ts
- app/layout.tsx
- evidence.ts
- config/index.ts
- pipeline.ts
- add-credential-dialog.tsx
- Relay (PRD): short-form video to evidence-grounded Markdown
- components.json
- shape.ts
- schema.ts
- logger.ts
- verify.ts
- getDb
- catalog.ts
- SESSION_AUTH: server-side cookie capture for social sources
- settings/page.tsx
- run-detail.tsx
- Relay UI/UX philosophy (data-dense command center)
- extraction/prompts.ts
- compose: capture service (Chromium, shm, seccomp)
- toast.tsx
- §2.1 Capture runs in its own Bun process
- `auth_users`
- §3 Storage model (column mapping for a cookie credential)
- credentials-row.tsx
- prompt-card.tsx
- extraction/index.ts
- lib/settings.ts
- download.ts
- auth-session.ts
- admission.ts
- Relay README (stack, setup, layout)
- Relay Brand Mark (logo.png)
- schema-pipeline.ts
- binaries.ts
- query-status.tsx
- rays.ts
- Gemini wired for extraction
- json-view.tsx
- synthesize.ts
- notion.ts
- dependencies
- lib/runs.ts
- login/page.tsx
- §4.2 withSourceCookies (materialize and destroy)
- §1.1 YouTube GVS 403 (settled by measurement)
- db/index.ts
- proxy.ts
- free-port.ts
- privacy/page.tsx
- terms/page.tsx
- best-effort-json-parser
- better-auth
- @better-auth/drizzle-adapter
- bullmq
- @cfworker/json-schema
- class-variance-authority
- clsx
- @dnd-kit/core
- @dnd-kit/sortable
- drizzle-orm
- gsap
- @gsap/react
- @hugeicons/core-free-icons
- @hugeicons/react
- ioredis
- json-edit-react
- @libsql/client
- next
- next.config.ts
- next-themes
- @notionhq/client
- @openobserve/browser-logs
- pino
- react
- react-dom
- react-resizable-panels
- shadcn
- tailwind-merge
- @tanstack/react-query
- @thesvg/react
- tw-animate-css
- zod
- postcss.config.mjs
- Biome for lint+format, tsc only for typecheck
- Generous scale (desktop command center sizing)

## God Nodes (most connected - your core abstractions)
1. `cn()` - 204 edges
2. `getDb()` - 55 edges
3. `config` - 33 edges
4. `Button()` - 30 edges
5. `logger` - 25 edges
6. `providerLabel()` - 24 edges
7. `requireSession()` - 18 edges
8. `toast` - 17 edges
9. `compilerOptions` - 17 edges
10. `Spinner()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Component strictness: zero native form elements` --semantically_similar_to--> `UI rule: ShadCN components and HugeIcons only`  [INFERRED] [semantically similar]
  DESIGN.md → RULES.md
- `Evidence verification (Task 4.5)` --semantically_similar_to--> `Task 4.4-4.6: Extraction, Grounding & Notion Publishing`  [INFERRED] [semantically similar]
  LLM_STATE.md → CHANGELOG.md
- `Queue admission control (src/lib/queue/admission.ts)` --semantically_similar_to--> `§5.1 Capture concurrency cap and teardown`  [INFERRED] [semantically similar]
  LLM_STATE.md → SESSION_AUTH.md
- `ShadCN preset b5pFrsf5Vq (mira/zinc/emerald)` --semantically_similar_to--> `0.1.0 - Foundation & Database`  [INFERRED] [semantically similar]
  DESIGN.md → CHANGELOG.md
- `Docker / Coolify deployment notes` --semantically_similar_to--> `Deployment: deps/builder/runtime Dockerfile stages`  [INFERRED] [semantically similar]
  LLM_STATE.md → CHANGELOG.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Queue admission control (three locks + deferral)** — llm_state_per_user_slot, llm_state_per_credential_jar_lock, llm_state_rate_budget_rolling_window, llm_state_deferral_moveto_delayed [EXTRACTED 1.00]
- **Session capture flow (mint ticket, stream, harvest, consume)** — session_auth_capture_own_process, session_auth_screencast_ws_security, session_auth_capture_provider_registry, session_auth_storage_model, session_auth_with_source_cookies [EXTRACTED 1.00]
- **Logo mark construction: arrow, stack, interlock and palette form one identity** — public_logo_relay_brand_mark, public_logo_play_triangle_motif, public_logo_stacked_bars_motif, public_logo_interlock_composition, public_logo_brand_palette [EXTRACTED 1.00]
- **Evidence grounding chain (transcript to published citation)** — prd_evidence_grounding, llm_state_transcription_gotchas, llm_state_evidence_contract_structural, llm_state_evidence_verification_4_5, llm_state_document_tree_notion_publish [INFERRED 0.85]
- **Relay Visual Identity System** — public_logo_relay_mark, public_logo_brand_palette, public_logo_relay_route_motif, public_logo_stacked_bars_motif, public_logo_app_icon_canvas [INFERRED 0.85]

## Communities (106 total, 39 thin omitted)

### Community 0 - "agents-table.tsx"
Cohesion: 0.17
Nodes (16): dateFormat, AgentsTableSkeleton(), TypeBadge(), QueryErrorState(), QueryStatusBar(), updatedAgo(), dateFormat, duration() (+8 more)

### Community 1 - "cn"
Cohesion: 0.05
Nodes (68): DashboardLayout(), AppSidebar(), NAV, ProfileUser, ThemeToggle(), Breadcrumb(), BreadcrumbEllipsis(), BreadcrumbItem() (+60 more)

### Community 2 - "query/credentials.ts"
Cohesion: 0.17
Nodes (11): DeleteCredential(), credentialsQueryOptions(), fetchCredentials(), UpdateCredentialVariables, useCredentials(), useDeleteCredential(), API_BASE, ApiError (+3 more)

### Community 3 - "sources.ts"
Cohesion: 0.19
Nodes (12): Brand, BRANDS, faviconFor(), LinkIcon(), secondLevel(), SOURCE_ICON, SourceIcon(), MEDIA_SOURCES (+4 more)

### Community 4 - "profile-card.tsx"
Cohesion: 0.19
Nodes (12): ProviderOrderRow, ProviderOrderRowProps, ChangePasswordForm(), Card(), CardAction(), CardContent(), CardDescription(), CardFooter() (+4 more)

### Community 5 - "lib/providers.ts"
Cohesion: 0.05
Nodes (54): ProviderMark(), PublishedPanel(), MODE_LABEL, Phase, phasesFrom(), ProviderChip(), RunModels(), STAGE_BAR (+46 more)

### Community 6 - "scripts"
Cohesion: 0.05
Nodes (36): @biomejs/biome, drizzle-kit, devDependencies, @biomejs/biome, drizzle-kit, tailwindcss, @tailwindcss/postcss, @types/bun (+28 more)

### Community 7 - "schemas.ts"
Cohesion: 0.08
Nodes (28): app, DELETE, GET, PATCH, POST, PUT, PromptKey, updatePrompt() (+20 more)

### Community 8 - "transcription/index.ts"
Cohesion: 0.12
Nodes (26): NoTranscriptionKeyError, ResolvedProvider, resolveProvider(), transcribe(), Transcription, providers, TRANSCRIPTION_ORDER, transcriptionProvider (+18 more)

### Community 9 - "biome.json"
Cohesion: 0.06
Nodes (32): css, parser, next, react, files, includes, formatter, enabled (+24 more)

### Community 10 - "utils.ts"
Cohesion: 0.15
Nodes (25): DisabledActionSlot(), ACCENT, ModalAccent, ModalProps, ModalSize, SIZE, AlertDialog(), AlertDialogAction() (+17 more)

### Community 11 - "query/agents.ts"
Cohesion: 0.11
Nodes (25): AgentFormDialog(), onOpenChange(), initialModeFor(), AgentFormFields(), AgentStatusToggle(), AgentsTable(), DeleteAgent(), AgentFormMode (+17 more)

### Community 12 - "nav-user.tsx"
Cohesion: 0.09
Nodes (23): NavUser(), ProfileCard(), Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage() (+15 more)

### Community 13 - "compilerOptions"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, next.config.ts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts (+22 more)

### Community 14 - "vault.ts"
Cohesion: 0.13
Nodes (24): db, VaultData(), decrypt(), encrypt(), EncryptedPayload, getMasterKey(), credentials, CredentialType (+16 more)

### Community 15 - "edit-credential-dialog.tsx"
Cohesion: 0.20
Nodes (18): Dialog(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogTitle(), DialogTrigger(), Field() (+10 more)

### Community 16 - "chat.ts"
Cohesion: 0.15
Nodes (15): attemptPass(), ChatRun, disposition(), PassResult, retryAfterMs(), ChatTask, EXTRACTION_ORDER, OLLAMA_CAPABILITIES (+7 more)

### Community 17 - "extraction/route.ts"
Cohesion: 0.23
Nodes (14): classify(), forRouting(), requestedAgent(), routableAgents(), routeAgent(), RoutingMode, toRouting(), seedSystemAgents() (+6 more)

### Community 18 - "ingest.ts"
Cohesion: 0.24
Nodes (12): BinaryVersions, IngestErrorCode, MediaIngestError, exists(), extractAudio(), ingest(), IngestedAudio, purge() (+4 more)

### Community 19 - "app/layout.tsx"
Cohesion: 0.10
Nodes (22): fontMono, metadata, oxaniumHeading, RootLayout(), spaceGrotesk, ErrorBoundaryState, TelemetryErrorBoundary, TelemetryProvider() (+14 more)

### Community 20 - "evidence.ts"
Cohesion: 0.10
Nodes (19): COMPACT_EVIDENCE, Evidence, EVIDENCE_SCHEMA, EvidenceKind, isEvidence(), isTranscriptEvidence(), isVisualEvidence(), SchemaFragment (+11 more)

### Community 21 - "config/index.ts"
Cohesion: 0.12
Nodes (15): attempt(), CHAIN, FIXTURES, label(), main(), worker, metadata, LandingPage() (+7 more)

### Community 22 - "pipeline.ts"
Cohesion: 0.21
Nodes (15): VerificationSummary, codeOf(), descriptionOf(), isPermanent(), messageOf(), titleOf(), processRun(), buildProperties() (+7 more)

### Community 23 - "add-credential-dialog.tsx"
Cohesion: 0.19
Nodes (12): Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), AddCredentialDialog(), PANEL, TAB_ACCENT (+4 more)

### Community 24 - "Relay (PRD): short-form video to evidence-grounded Markdown"
Cohesion: 0.11
Nodes (23): 0.2.0 - Credentials Dashboard & Notion Ray, Task 4.4-4.6: Extraction, Grounding & Notion Publishing, Document tree and Notion publish (Task 4.6), The evidence contract is structural, not requested, Evidence verification (Task 4.5), Planned Task 4.3b: frame/vision extraction (amends PRD §5), Groq free-tier TPM pressure and mitigations, Media ingest gotchas (ffmpeg exit 8, Bun $ newline, rm no-op) (+15 more)

### Community 25 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 26 - "shape.ts"
Cohesion: 0.09
Nodes (34): ClaimFinding, REASON_TEXT, Item(), RunExtraction(), countEvidence(), Evidence, evidenceRange(), ExtractedField (+26 more)

### Community 27 - "schema.ts"
Cohesion: 0.17
Nodes (11): Agent, authSessions, authVerifications, Credential, NewAgent, NewCredential, NewRelayRun, NewUser (+3 more)

### Community 28 - "logger.ts"
Cohesion: 0.12
Nodes (15): flushAll(), isSensitiveKey(), LogEventInput, logFileStream, LogLevel, OpenObserveConfig, openObserveMiddleware(), OpenObserveStream (+7 more)

### Community 29 - "verify.ts"
Cohesion: 0.16
Nodes (17): normalise(), NormalisedTranscript, normaliseTranscript(), check(), contentWords(), Finding, isRecord(), pointerSegment() (+9 more)

### Community 30 - "getDb"
Cohesion: 0.41
Nodes (10): DuplicateAgentNameError, nameTaken(), createAgent(), deleteAgent(), listAgents(), setAgentActive(), toSummary(), updateAgent() (+2 more)

### Community 31 - "catalog.ts"
Cohesion: 0.20
Nodes (17): CachedCatalog, catalogFor(), credentialStamp(), fetchModels(), readCache(), warm(), writeCache(), asArray() (+9 more)

### Community 32 - "SESSION_AUTH: server-side cookie capture for social sources"
Cohesion: 0.14
Nodes (19): Queue admission control (src/lib/queue/admission.ts), Capture security model (loopback CDP, ticket, fenced navigation), Deferral via moveToDelayed + DelayedError, Deferred: social cookie credentials (2026-08-31 decision), Per-user slot semaphore (fairness), Per-credential rate budget as a rolling window, Zod validates all external input at the API boundary, Branch A: yt-dlp-only consolidation (+11 more)

### Community 33 - "settings/page.tsx"
Cohesion: 0.05
Nodes (60): AgentsData(), AgentsPage(), dynamic, metadata, DashboardCatchAll(), generateMetadata(), Params, sectionTitle() (+52 more)

### Community 34 - "run-detail.tsx"
Cohesion: 0.05
Nodes (49): DeleteRun(), ExternalLink(), hostOf(), Linkify(), Token, tokenize(), NewRunDialog(), dateFormat (+41 more)

### Community 35 - "Relay UI/UX philosophy (data-dense command center)"
Cohesion: 0.13
Nodes (18): 0.1.0 - Foundation & Database, Component strictness: zero native form elements, GSAP animation standards (useGSAP, guarded refs), ShadCN preset b5pFrsf5Vq (mira/zinc/emerald), Typography & iconography (Oxanium, Space Grotesk, JetBrains Mono, HugeIcons), Relay UI/UX philosophy (data-dense command center), Authenticated browser verification via signed auth_sessions cookie, Explicit Clone replaces copy-on-write for System agents (+10 more)

### Community 36 - "extraction/prompts.ts"
Cohesion: 0.21
Nodes (16): cached(), cacheKeys, client(), get(), globalForCache, invalidate(), keyFor(), put() (+8 more)

### Community 37 - "compose: capture service (Chromium, shm, seccomp)"
Cohesion: 0.16
Nodes (17): 0.3.0 - Coolify deployment & Drizzle Gateway, Authentication & Observability (Better Auth, Pino, Rays rebrand), Deployment: deps/builder/runtime Dockerfile stages, Relay Changelog, OpenObserve observability (client RUM + server logs), CAPTURE_INTERNAL_TOKEN (dedicated inter-service secret), compose: capture service (Chromium, shm, seccomp), compose: dragonfly service (pinned, allow-undeclared-keys) (+9 more)

### Community 38 - "toast.tsx"
Cohesion: 0.17
Nodes (7): TOAST_TYPE_STYLES, ToastAction(), ToastClose(), ToastContent(), ToastDescription(), ToastTitle(), ToastViewport()

### Community 39 - "§2.1 Capture runs in its own Bun process"
Cohesion: 0.14
Nodes (16): Source-scoped binary preflight (ensureMediaBinaries), Capture browser launch prerequisites (xauth, chromium-sandbox, seccomp), CAPTURE_PUBLIC_URL public wss route (open decision), Capture service as a third process (Phase 2), Three capture bugs found by testing, Instagram unblocked via instaloader, Three-tier link icon resolution, Media source registry (src/lib/media/sources.ts) (+8 more)

### Community 40 - "`auth_users`"
Cohesion: 0.17
Nodes (10): `agents`, `auth_accounts`, `auth_sessions`, `auth_users`, `auth_verifications`, `credentials`, `relay_runs`, `model_catalog` (+2 more)

### Community 41 - "§3 Storage model (column mapping for a cookie credential)"
Cohesion: 0.17
Nodes (15): additional_data reduced to a derived `stale` boolean, BYOK encrypted credential vault, Security rule: encrypted tokens, plaintext meta_data, never logged, §3.2 expires_at is a floor on uselessness, §4.4 Capture logging allowlist, §3.3 What must never enter meta_data, §3.5 Migration: NONE (Drizzle enum is TypeScript-level), §3.4 Reconnect works with no new code (+7 more)

### Community 42 - "credentials-row.tsx"
Cohesion: 0.30
Nodes (12): accountEmailFor(), accountNameFor(), dateFormat, displayName(), metaString(), ProviderTile(), RowActions(), StaleBadge() (+4 more)

### Community 43 - "prompt-card.tsx"
Cohesion: 0.33
Nodes (6): ACCENT, FALLBACK, RunStatusBadge(), Badge(), badgeVariants, runStatusMeta

### Community 44 - "extraction/index.ts"
Cohesion: 0.25
Nodes (12): SkippedModel, compactSchemaForPrompt(), asObject(), buildSystem(), extract(), Extraction, ExtractionError, formatTranscript() (+4 more)

### Community 45 - "lib/settings.ts"
Cohesion: 0.26
Nodes (11): chatProvider, AiKeyProviderId, isKeylessProvider(), extractionOrderSchema, getExtractionOrder(), readSetting(), resolveExtractionOrder(), SETTING_KEYS (+3 more)

### Community 46 - "download.ts"
Cohesion: 0.29
Nodes (10): download(), DownloadResult, downloadWithYtDlp(), DROPPED_INFO_KEYS, isPlaceholderTitle(), pruneInfo(), runYtDlp(), withSyntheticTitle() (+2 more)

### Community 47 - "auth-session.ts"
Cohesion: 0.30
Nodes (7): { GET, POST }, Home(), auth, authSchema, AuthSession, getRequestSession, getSessionFromHeaders()

### Community 48 - "admission.ts"
Cohesion: 0.17
Nodes (21): acquire(), acquireUserSlot(), Admission, admitRun(), budgetKey(), chargeBudget(), checkWindow(), credentialLockKey() (+13 more)

### Community 49 - "Relay README (stack, setup, layout)"
Cohesion: 0.20
Nodes (12): Next.js Agent Rules (read node_modules docs first), LLM Execution State (Relay task ledger), Stage completion derived from recorded timings, The stale-worker trap, Google Search Console site-verification file, Project layout (src/app, lib/db, observability, crypto, schemas), Relay README (stack, setup, layout), Relay stack table (Bun, Next.js, Hono, Drizzle, Zod, Biome) (+4 more)

### Community 50 - "Relay Brand Mark (logo.png)"
Cohesion: 0.33
Nodes (11): Public Static App Icon Asset, Square 1024x1024 App-Icon Canvas, Brand Palette: Emerald Green + Navy Accent on White, Arrow-Into-Stack Interlock Composition, Media Relay / Extraction Product Identity, Play / Forward-Arrow Triangle Motif, Relay Brand Mark (logo.png), Relay (Brand Name) (+3 more)

### Community 51 - "schema-pipeline.ts"
Cohesion: 0.20
Nodes (9): authUsers, ModelCatalog, NewModelCatalog, NewPrompt, NewUserSetting, Prompt, prompts, UserSetting (+1 more)

### Community 52 - "binaries.ts"
Cohesion: 0.29
Nodes (8): BINARIES, BinarySpec, detectBinary(), detected, ensureMediaBinaries(), firstLine(), MediaBinaryError, missingMessage()

### Community 53 - "query-status.tsx"
Cohesion: 0.19
Nodes (17): ROWS, QueryStatusBarProps, QueryStatusBarSkeleton(), relative, ROWS, RunsTableSkeleton(), Skeleton(), Table() (+9 more)

### Community 54 - "rays.ts"
Cohesion: 0.27
Nodes (10): VaultPage(), RayProviderId, configuredRayIds(), getProvider(), isConfigured(), providers, RayProvider, redirectUri() (+2 more)

### Community 55 - "Gemini wired for extraction"
Cohesion: 0.24
Nodes (10): Agent sprawl: the router was the cause, disposition(): 5xx is next-model, not fail, Gemini wired for extraction, The gemma `excludes` wrong turn, isolate() and the unterminated trailing fence, Capability-driven model ranking heuristics, Ollama local + cloud provider, Every prompt lives in the database with Redis hot cache (+2 more)

### Community 56 - "json-view.tsx"
Cohesion: 0.18
Nodes (11): JsonPanel(), onCopy(), useCollapseAll(), JSON_EDITOR_BASE, THEME, JsonInput(), JsonView(), RunRawData() (+3 more)

### Community 57 - "synthesize.ts"
Cohesion: 0.23
Nodes (11): NoExtractionKeyError, runChat(), compile(), describe(), FieldPlan, fromExisting(), isPlan(), isReuse() (+3 more)

### Community 58 - "notion.ts"
Cohesion: 0.27
Nodes (10): ensureCategoryPage(), ensureEntriesDataSource(), ensureGuidesTarget(), findGuidesDataSource(), GuidesTarget, NotionGuidesError, plainTitle(), titlePropertyName() (+2 more)

### Community 59 - "dependencies"
Cohesion: 0.22
Nodes (9): @base-ui/react, @dnd-kit/utilities, hono, @openobserve/browser-rum, dependencies, @base-ui/react, @dnd-kit/utilities, hono (+1 more)

### Community 60 - "lib/runs.ts"
Cohesion: 0.21
Nodes (14): RunData(), RunStatus, sourceLabel(), createRun(), deleteRun(), getRun(), RunDetail, RunPatch (+6 more)

### Community 63 - "§4.2 withSourceCookies (materialize and destroy)"
Cohesion: 0.33
Nodes (6): Per-credential jar lock (correctness), Jar write-back on a FAILED download (bug), §3.6 getSecretByType (vault widening), §4.2 Jar rotation write-back (--cookies is read-write), §4.2 withSourceCookies (materialize and destroy), §4.2b YouTube's stricter cookie rules

### Community 66 - "§1.1 YouTube GVS 403 (settled by measurement)"
Cohesion: 0.60
Nodes (5): Phase 0: YouTube GVS 403 and player_client fallbacks, bun run verify:ytdlp acceptance test, §1.1b PO tokens rejected, §1.1 YouTube GVS 403 (settled by measurement), Risk #8: the yt-dlp pin is stale with no bump cadence

### Community 67 - "db/index.ts"
Cohesion: 0.18
Nodes (9): db, indexes, raw, tables, { construct }, { createClient }, createDb(), globalForDb (+1 more)

### Community 69 - "proxy.ts"
Cohesion: 0.60
Nodes (4): config, proxy(), redact(), sendTrace()

## Ambiguous Edges - Review These
- `Project layout (src/app, lib/db, observability, crypto, schemas)` → `Google Search Console site-verification file`  [AMBIGUOUS]
  public/google81b6e6165b427f27.html · relation: conceptually_related_to

## Knowledge Gaps
- **327 isolated node(s):** `$schema`, `enabled`, `clientKind`, `useIgnoreFile`, `src/**` (+322 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 435 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Project layout (src/app, lib/db, observability, crypto, schemas)` and `Google Search Console site-verification file`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `cn()` connect `cn` to `agents-table.tsx`, `settings/page.tsx`, `run-detail.tsx`, `sources.ts`, `profile-card.tsx`, `lib/providers.ts`, `toast.tsx`, `utils.ts`, `query/agents.ts`, `prompt-card.tsx`, `nav-user.tsx`, `credentials-row.tsx`, `edit-credential-dialog.tsx`, `app/layout.tsx`, `query-status.tsx`, `add-credential-dialog.tsx`, `json-view.tsx`, `shape.ts`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `config` connect `config/index.ts` to `cn`, `query/credentials.ts`, `sources.ts`, `schemas.ts`, `vault.ts`, `chat.ts`, `ingest.ts`, `app/layout.tsx`, `logger.ts`, `catalog.ts`, `extraction/prompts.ts`, `download.ts`, `auth-session.ts`, `admission.ts`, `binaries.ts`, `rays.ts`, `notion.ts`, `login/page.tsx`, `db/index.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `getDb()` connect `getDb` to `settings/page.tsx`, `db/index.ts`, `extraction/prompts.ts`, `schemas.ts`, `transcription/index.ts`, `lib/settings.ts`, `vault.ts`, `auth-session.ts`, `admission.ts`, `extraction/route.ts`, `evidence.ts`, `pipeline.ts`, `synthesize.ts`, `lib/runs.ts`, `catalog.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `$schema`, `enabled`, `clientKind` to the rest of the system?**
  _327 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.047905909351692484 - nodes in this community are weakly interconnected._
- **Should `lib/providers.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.050351721584598295 - nodes in this community are weakly interconnected._
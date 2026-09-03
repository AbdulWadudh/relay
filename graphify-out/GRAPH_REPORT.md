# Graph Report - relay  (2026-09-03)

## Corpus Check
- 257 files · ~168,366 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1727 nodes · 4011 edges · 120 communities (78 shown, 40 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ae3f9ac2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- runs-table.tsx
- cn
- Troubleshooting
- logger.ts
- toast.tsx
- document.ts
- scripts
- Relay production runbook
- transcription/index.ts
- biome.json
- button.tsx
- query/agents.ts
- nav-user.tsx
- compilerOptions
- auth-request.ts
- utils.ts
- query-status.tsx
- evidence.ts
- ingest.ts
- app/layout.tsx
- lib/providers.ts
- config/index.ts
- credentials-row.tsx
- add-credential-dialog.tsx
- Relay (PRD): short-form video to evidence-grounded Markdown
- components.json
- run-detail.tsx
- schema.ts
- query/credentials.ts
- chat.ts
- extraction/index.ts
- verify.ts
- SESSION_AUTH: server-side cookie capture for social sources
- pipeline.ts
- prompts/page.tsx
- Relay UI/UX philosophy (data-dense command center)
- catalog.ts
- compose: capture service (Chromium, shm, seccomp)
- json-view.tsx
- §2.1 Capture runs in its own Bun process
- `auth_users`
- §3 Storage model (column mapping for a cookie credential)
- edit-credential-dialog.tsx
- vault.ts
- pagination.tsx
- Egress proxy — YouTube from the production host
- lib/runs.ts
- queue/worker.ts
- media/cookies.ts
- Relay README (stack, setup, layout)
- Relay Brand Mark (logo.png)
- notion-guides.ts
- lib/settings.ts
- [[...route]]/route.ts
- rays.ts
- Gemini wired for extraction
- schemas.ts
- server/runs.ts
- admission.ts
- dependencies
- notion.ts
- [id]/page.tsx
- getDb
- §4.2 withSourceCookies (materialize and destroy)
- db/index.ts
- agents/page.tsx
- §1.1 YouTube GVS 403 (settled by measurement)
- runs/page.tsx
- models.ts
- skip-paths.ts
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
- vault/page.tsx
- extraction/route.ts
- auth-session.ts
- settings/page.tsx
- [...catchAll]/page.tsx
- verify-proxy.ts
- verify-ytdlp.ts
- OpenObserveStream
- synthesize.ts
- PromptCard

## God Nodes (most connected - your core abstractions)
1. `cn()` - 220 edges
2. `getDb()` - 54 edges
3. `config` - 37 edges
4. `Button()` - 35 edges
5. `logger` - 28 edges
6. `providerLabel()` - 23 edges
7. `toast` - 18 edges
8. `requireSession()` - 18 edges
9. `Spinner()` - 17 edges
10. `compilerOptions` - 17 edges

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

## Communities (120 total, 40 thin omitted)

### Community 0 - "runs-table.tsx"
Cohesion: 0.14
Nodes (20): DisabledActionSlot(), AGENT_COLUMNS, dateFormat, AgentsTableSkeleton(), TypeBadge(), DataColumn, DataTable(), QueryErrorState() (+12 more)

### Community 1 - "cn"
Cohesion: 0.05
Nodes (63): DashboardLayout(), AppSidebar(), NAV, ProfileUser, ThemeToggle(), AlertDialogMedia(), AlertDialogOverlay(), Breadcrumb() (+55 more)

### Community 2 - "Troubleshooting"
Cohesion: 0.07
Nodes (27): 1. Open a private window, 1. Sign in, 2. Go to the export page, 2. Sign in to YouTube, 3. Export, 3. Navigate to robots.txt — in the same tab, 4. Export, then close the window immediately, 4. Upload (+19 more)

### Community 3 - "logger.ts"
Cohesion: 0.13
Nodes (16): openObserveMiddleware(), traceBody(), LogEventInput, logFileStream, LogLevel, OpenObserveConfig, pino, pinoLogger (+8 more)

### Community 4 - "toast.tsx"
Cohesion: 0.12
Nodes (17): ChangePasswordForm(), Card(), CardAction(), CardContent(), CardDescription(), CardFooter(), CardHeader(), CardTitle() (+9 more)

### Community 5 - "document.ts"
Cohesion: 0.12
Nodes (27): ClaimFinding, REASON_TEXT, Item(), RunExtraction(), countEvidence(), Evidence, evidenceRange(), ExtractedField (+19 more)

### Community 6 - "scripts"
Cohesion: 0.05
Nodes (37): @biomejs/biome, drizzle-kit, devDependencies, @biomejs/biome, drizzle-kit, tailwindcss, @tailwindcss/postcss, @types/bun (+29 more)

### Community 7 - "Relay production runbook"
Cohesion: 0.10
Nodes (19): 1. What is running, 2. The pipeline, 3. YouTube egress — the part most likely to break, 4.1 Read the run's own logs first, 4.2 Match the message, 4.3 Error classification, 4.4 The OpenObserve read path returns 401, 4.5 What is deliberately NOT shipped to OpenObserve (+11 more)

### Community 8 - "transcription/index.ts"
Cohesion: 0.12
Nodes (26): AiKeyProviderId, NoTranscriptionKeyError, ResolvedProvider, resolveProvider(), transcribe(), Transcription, providers, TRANSCRIPTION_ORDER (+18 more)

### Community 9 - "biome.json"
Cohesion: 0.06
Nodes (32): css, parser, next, react, files, includes, formatter, enabled (+24 more)

### Community 10 - "button.tsx"
Cohesion: 0.21
Nodes (19): canRetry(), RetryRun(), TERMINAL, RunDetailHeader(), AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent() (+11 more)

### Community 11 - "query/agents.ts"
Cohesion: 0.13
Nodes (22): AgentFormDialog(), onOpenChange(), initialModeFor(), AgentStatusToggle(), DeleteAgent(), AgentFormMode, DEFAULT_CONFIG, DEFAULT_SCHEMA (+14 more)

### Community 12 - "nav-user.tsx"
Cohesion: 0.09
Nodes (23): NavUser(), ProfileCard(), Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage() (+15 more)

### Community 13 - "compilerOptions"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, next.config.ts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts (+22 more)

### Community 14 - "auth-request.ts"
Cohesion: 0.43
Nodes (4): { GET, POST }, auth, authSchema, AuthSession

### Community 15 - "utils.ts"
Cohesion: 0.14
Nodes (11): JsonPanel(), ACCENT, FALLBACK, RunStatusBadge(), Badge(), badgeVariants, ResizableHandle(), ResizablePanelGroup() (+3 more)

### Community 16 - "query-status.tsx"
Cohesion: 0.20
Nodes (17): ROWS, QueryStatusBar(), QueryStatusBarProps, QueryStatusBarSkeleton(), relative, updatedAgo(), ROWS, Skeleton() (+9 more)

### Community 17 - "evidence.ts"
Cohesion: 0.10
Nodes (19): COMPACT_EVIDENCE, Evidence, EVIDENCE_SCHEMA, EvidenceKind, isEvidence(), isTranscriptEvidence(), isVisualEvidence(), SchemaFragment (+11 more)

### Community 18 - "ingest.ts"
Cohesion: 0.06
Nodes (54): Brand, BRANDS, faviconFor(), LinkIcon(), secondLevel(), SOURCE_ICON, SourceIcon(), BINARIES (+46 more)

### Community 19 - "app/layout.tsx"
Cohesion: 0.10
Nodes (22): fontMono, metadata, oxaniumHeading, RootLayout(), spaceGrotesk, ErrorBoundaryState, TelemetryErrorBoundary, TelemetryProvider() (+14 more)

### Community 20 - "lib/providers.ts"
Cohesion: 0.05
Nodes (54): ProviderMark(), MODE_LABEL, Phase, phasesFrom(), ProviderChip(), RunModels(), STAGE_BAR, ProviderOrderRow (+46 more)

### Community 21 - "config/index.ts"
Cohesion: 0.11
Nodes (13): LoginForm(), metadata, metadata, LandingPage(), marquee, MARQUEE_LOOP, stories, AppConfig (+5 more)

### Community 22 - "credentials-row.tsx"
Cohesion: 0.18
Nodes (18): accountEmailFor(), accountNameFor(), dateFormat, displayName(), metaString(), ProviderTile(), ReconnectSession(), RowActions() (+10 more)

### Community 23 - "add-credential-dialog.tsx"
Cohesion: 0.14
Nodes (15): Modal(), Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), AddCredentialDialog(), PANEL (+7 more)

### Community 24 - "Relay (PRD): short-form video to evidence-grounded Markdown"
Cohesion: 0.11
Nodes (23): 0.2.0 - Credentials Dashboard & Notion Ray, Task 4.4-4.6: Extraction, Grounding & Notion Publishing, Document tree and Notion publish (Task 4.6), The evidence contract is structural, not requested, Evidence verification (Task 4.5), Planned Task 4.3b: frame/vision extraction (amends PRD §5), Groq free-tier TPM pressure and mitigations, Media ingest gotchas (ffmpeg exit 8, Bun $ newline, rm no-op) (+15 more)

### Community 25 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 26 - "run-detail.tsx"
Cohesion: 0.05
Nodes (55): ExternalLink(), hostOf(), Linkify(), Token, tokenize(), PublishedPanel(), dateFormat, RunDetail() (+47 more)

### Community 27 - "schema.ts"
Cohesion: 0.10
Nodes (20): Agent, authSessions, authUsers, authVerifications, Credential, NewAgent, NewCredential, NewRelayRun (+12 more)

### Community 28 - "query/credentials.ts"
Cohesion: 0.12
Nodes (16): DeleteRun(), DeleteCredential(), currentAccount(), EditCredentialDialog(), reset(), submit(), credentialsQueryOptions(), fetchCredentials() (+8 more)

### Community 29 - "chat.ts"
Cohesion: 0.18
Nodes (15): attemptPass(), ChatRun, disposition(), NoExtractionKeyError, PassResult, retryAfterMs(), runChat(), chatProvider (+7 more)

### Community 30 - "extraction/index.ts"
Cohesion: 0.20
Nodes (17): SkippedModel, compactSchemaForPrompt(), asObject(), buildSystem(), extract(), Extraction, ExtractionError, formatTranscript() (+9 more)

### Community 31 - "verify.ts"
Cohesion: 0.15
Nodes (17): normalise(), NormalisedTranscript, normaliseTranscript(), check(), contentWords(), Finding, isRecord(), pointerSegment() (+9 more)

### Community 32 - "SESSION_AUTH: server-side cookie capture for social sources"
Cohesion: 0.14
Nodes (19): Queue admission control (src/lib/queue/admission.ts), Capture security model (loopback CDP, ticket, fenced navigation), Deferral via moveToDelayed + DelayedError, Deferred: social cookie credentials (2026-08-31 decision), Per-user slot semaphore (fairness), Per-credential rate budget as a rolling window, Zod validates all external input at the API boundary, Branch A: yt-dlp-only consolidation (+11 more)

### Community 33 - "pipeline.ts"
Cohesion: 0.24
Nodes (15): verifyExtraction(), RunContext, setRunStage(), storage, withRunContext(), codeOf(), descriptionOf(), isPermanent() (+7 more)

### Community 34 - "prompts/page.tsx"
Cohesion: 0.20
Nodes (12): dynamic, metadata, PromptsData(), PromptsPage(), RunPage(), VaultPage(), PromptsList(), CARDS (+4 more)

### Community 35 - "Relay UI/UX philosophy (data-dense command center)"
Cohesion: 0.13
Nodes (18): 0.1.0 - Foundation & Database, Component strictness: zero native form elements, GSAP animation standards (useGSAP, guarded refs), ShadCN preset b5pFrsf5Vq (mira/zinc/emerald), Typography & iconography (Oxanium, Space Grotesk, JetBrains Mono, HugeIcons), Relay UI/UX philosophy (data-dense command center), Authenticated browser verification via signed auth_sessions cookie, Explicit Clone replaces copy-on-write for System agents (+10 more)

### Community 36 - "catalog.ts"
Cohesion: 0.15
Nodes (24): cached(), cacheKeys, client(), get(), globalForCache, invalidate(), keyFor(), put() (+16 more)

### Community 37 - "compose: capture service (Chromium, shm, seccomp)"
Cohesion: 0.16
Nodes (17): 0.3.0 - Coolify deployment & Drizzle Gateway, Authentication & Observability (Better Auth, Pino, Rays rebrand), Deployment: deps/builder/runtime Dockerfile stages, Relay Changelog, OpenObserve observability (client RUM + server logs), CAPTURE_INTERNAL_TOKEN (dedicated inter-service secret), compose: capture service (Chromium, shm, seccomp), compose: dragonfly service (pinned, allow-undeclared-keys) (+9 more)

### Community 38 - "json-view.tsx"
Cohesion: 0.20
Nodes (10): onCopy(), useCollapseAll(), JSON_EDITOR_BASE, THEME, JsonInput(), JsonView(), RunRawData(), Collapsible() (+2 more)

### Community 39 - "§2.1 Capture runs in its own Bun process"
Cohesion: 0.14
Nodes (16): Source-scoped binary preflight (ensureMediaBinaries), Capture browser launch prerequisites (xauth, chromium-sandbox, seccomp), CAPTURE_PUBLIC_URL public wss route (open decision), Capture service as a third process (Phase 2), Three capture bugs found by testing, Instagram unblocked via instaloader, Three-tier link icon resolution, Media source registry (src/lib/media/sources.ts) (+8 more)

### Community 40 - "`auth_users`"
Cohesion: 0.17
Nodes (10): `agents`, `auth_accounts`, `auth_sessions`, `auth_users`, `auth_verifications`, `credentials`, `relay_runs`, `model_catalog` (+2 more)

### Community 41 - "§3 Storage model (column mapping for a cookie credential)"
Cohesion: 0.17
Nodes (15): additional_data reduced to a derived `stale` boolean, BYOK encrypted credential vault, Security rule: encrypted tokens, plaintext meta_data, never logged, §3.2 expires_at is a floor on uselessness, §4.4 Capture logging allowlist, §3.3 What must never enter meta_data, §3.5 Migration: NONE (Drizzle enum is TypeScript-level), §3.4 Reconnect works with no new code (+7 more)

### Community 42 - "edit-credential-dialog.tsx"
Cohesion: 0.09
Nodes (32): AgentFormFields(), ACCENT, ModalAccent, ModalProps, ModalSize, SIZE, NewRunDialog(), Dialog() (+24 more)

### Community 43 - "vault.ts"
Cohesion: 0.19
Nodes (14): CredentialType, ImportResult, credentialInputSchema, credentialUpdateSchema, createCredential(), CredentialMetaPatch, deleteCredential(), listCredentials() (+6 more)

### Community 44 - "pagination.tsx"
Cohesion: 0.24
Nodes (12): PageSlot, pageWindow(), RunsPagination(), buttonVariants, Pagination(), PaginationContent(), PaginationEllipsis(), PaginationItem() (+4 more)

### Community 45 - "Egress proxy — YouTube from the production host"
Cohesion: 0.10
Nodes (19): 1. The measurement this exists for, 1a. The trap that cost an afternoon — and the wrong lesson drawn from it, 2. How it is wired, 3. THE MANUAL STEP, AND WHY THERE ISN'T ONE ANY MORE, 4. Operating it, 5. Failure modes and what they mean, 6. Security notes, 7. Open questions and honest caveats (+11 more)

### Community 46 - "lib/runs.ts"
Cohesion: 0.33
Nodes (8): RunStatus, sourceLabel(), publishRun(), createRun(), RunPatch, RUNS_PER_PAGE, toSummary(), updateRun()

### Community 47 - "queue/worker.ts"
Cohesion: 0.22
Nodes (12): worker, createRedis(), getRedis(), getRunLogRedis(), globalForRedis, globalForRunLogs, enqueueRun(), getRunsQueue() (+4 more)

### Community 48 - "media/cookies.ts"
Cohesion: 0.26
Nodes (11): decrypt(), encrypt(), EncryptedPayload, getMasterKey(), persistRotation(), SourceCookies, withSourceCookies(), getSecretByType() (+3 more)

### Community 49 - "Relay README (stack, setup, layout)"
Cohesion: 0.20
Nodes (12): Next.js Agent Rules (read node_modules docs first), LLM Execution State (Relay task ledger), Stage completion derived from recorded timings, The stale-worker trap, Google Search Console site-verification file, Project layout (src/app, lib/db, observability, crypto, schemas), Relay README (stack, setup, layout), Relay stack table (Bun, Next.js, Hono, Drizzle, Zod, Biome) (+4 more)

### Community 50 - "Relay Brand Mark (logo.png)"
Cohesion: 0.33
Nodes (11): Public Static App Icon Asset, Square 1024x1024 App-Icon Canvas, Brand Palette: Emerald Green + Navy Accent on White, Arrow-Into-Stack Interlock Composition, Media Relay / Extraction Product Identity, Play / Forward-Arrow Triangle Motif, Relay Brand Mark (logo.png), Relay (Brand Name) (+3 more)

### Community 51 - "notion-guides.ts"
Cohesion: 0.36
Nodes (8): ensureCategoryPage(), ensureEntriesDataSource(), ensureGuidesTarget(), findGuidesDataSource(), GuidesTarget, NotionGuidesError, plainTitle(), titlePropertyName()

### Community 52 - "lib/settings.ts"
Cohesion: 0.26
Nodes (10): credentials, isKeylessProvider(), extractionOrderSchema, getExtractionOrder(), readSetting(), resolveExtractionOrder(), SETTING_KEYS, SettingKey (+2 more)

### Community 53 - "[[...route]]/route.ts"
Cohesion: 0.12
Nodes (16): app, DELETE, GET, PATCH, POST, PUT, PromptKey, updatePrompt() (+8 more)

### Community 54 - "rays.ts"
Cohesion: 0.31
Nodes (9): RayProviderId, configuredRayIds(), getProvider(), isConfigured(), providers, RayProvider, redirectUri(), stateCookieName() (+1 more)

### Community 55 - "Gemini wired for extraction"
Cohesion: 0.24
Nodes (10): Agent sprawl: the router was the cause, disposition(): 5xx is next-model, not fail, Gemini wired for extraction, The gemma `excludes` wrong turn, isolate() and the unterminated trailing fence, Capability-driven model ranking heuristics, Ollama local + cloud provider, Every prompt lives in the database with Redis hot cache (+2 more)

### Community 56 - "schemas.ts"
Cohesion: 0.17
Nodes (11): AI_KEY_PROVIDERS, PROVIDER_IDS, agentInputSchema, agentUpdateSchema, AI_PROVIDER_IDS, CookieImportInput, cookieImportSchema, ExtractionOrderInput (+3 more)

### Community 57 - "server/runs.ts"
Cohesion: 0.19
Nodes (15): appendRunLog(), dropRunLogs(), DROPPED, LEVEL_NAME, levelName(), readRunLogsHistory(), SearchHit, key() (+7 more)

### Community 58 - "admission.ts"
Cohesion: 0.32
Nodes (12): acquire(), acquireUserSlot(), Admission, admitRun(), budgetKey(), chargeBudget(), checkWindow(), credentialLockKey() (+4 more)

### Community 59 - "dependencies"
Cohesion: 0.22
Nodes (9): @base-ui/react, @dnd-kit/utilities, hono, @openobserve/browser-rum, dependencies, @base-ui/react, @dnd-kit/utilities, hono (+1 more)

### Community 60 - "notion.ts"
Cohesion: 0.18
Nodes (15): DocNode, RelayDocument, factLine(), NotionBlock, richText(), TextOptions, toBlocks(), toNotionBlocks() (+7 more)

### Community 61 - "[id]/page.tsx"
Cohesion: 0.19
Nodes (10): metadata, dynamic, metadata, Params, RunData(), ShellContent(), ShellHeader(), DashboardNotFoundPanel() (+2 more)

### Community 62 - "getDb"
Cohesion: 0.41
Nodes (10): DuplicateAgentNameError, nameTaken(), createAgent(), deleteAgent(), listAgents(), setAgentActive(), toSummary(), updateAgent() (+2 more)

### Community 63 - "§4.2 withSourceCookies (materialize and destroy)"
Cohesion: 0.33
Nodes (6): Per-credential jar lock (correctness), Jar write-back on a FAILED download (bug), §3.6 getSecretByType (vault widening), §4.2 Jar rotation write-back (--cookies is read-write), §4.2 withSourceCookies (materialize and destroy), §4.2b YouTube's stricter cookie rules

### Community 64 - "db/index.ts"
Cohesion: 0.18
Nodes (9): db, indexes, raw, tables, { construct }, { createClient }, createDb(), globalForDb (+1 more)

### Community 65 - "agents/page.tsx"
Cohesion: 0.22
Nodes (10): AgentsData(), AgentsPage(), dynamic, metadata, VaultData(), AgentsTable(), QueryProvider(), getQueryClient() (+2 more)

### Community 66 - "§1.1 YouTube GVS 403 (settled by measurement)"
Cohesion: 0.60
Nodes (5): Phase 0: YouTube GVS 403 and player_client fallbacks, bun run verify:ytdlp acceptance test, §1.1b PO tokens rejected, §1.1 YouTube GVS 403 (settled by measurement), Risk #8: the yt-dlp pin is stale with no bump cadence

### Community 67 - "runs/page.tsx"
Cohesion: 0.29
Nodes (7): dynamic, metadata, QueuePage(), RunsData(), RunsTable(), runKeys, listRuns()

### Community 68 - "models.ts"
Cohesion: 0.19
Nodes (13): asArray(), asNumber(), isFree(), normaliseCatalog(), normaliseModel(), parameterCount(), rankModels(), sizeScore() (+5 more)

### Community 69 - "skip-paths.ts"
Cohesion: 0.33
Nodes (7): SKIP_EXACT, SKIP_EXTENSIONS, skipRequestLog(), config, proxy(), redact(), sendTrace()

### Community 110 - "vault/page.tsx"
Cohesion: 0.22
Nodes (10): dynamic, metadata, CredentialsTableSkeleton(), VaultActions(), VaultNotices(), credentialKeys, promptKeys, fetchPrompts() (+2 more)

### Community 111 - "extraction/route.ts"
Cohesion: 0.38
Nodes (9): seedPrompts(), classify(), forRouting(), requestedAgent(), routableAgents(), routeAgent(), RoutingMode, toRouting() (+1 more)

### Community 112 - "auth-session.ts"
Cohesion: 0.70
Nodes (3): Home(), getRequestSession, getSessionFromHeaders()

### Community 113 - "settings/page.tsx"
Cohesion: 0.19
Nodes (11): dynamic, metadata, SettingsPage(), ProviderOrderCard(), SecurityCard(), authAccounts, settingKeys, extractionOrderQueryOptions() (+3 more)

### Community 114 - "[...catchAll]/page.tsx"
Cohesion: 0.53
Nodes (5): DashboardCatchAll(), generateMetadata(), Params, sectionTitle(), titleCase()

### Community 115 - "verify-proxy.ts"
Cohesion: 0.29
Nodes (6): Check, checks, FAILURE_SHAPES, leaks, logRecord, serialized

### Community 116 - "verify-ytdlp.ts"
Cohesion: 0.47
Nodes (5): attempt(), CHAIN, FIXTURES, label(), main()

### Community 118 - "synthesize.ts"
Cohesion: 0.31
Nodes (9): compile(), describe(), FieldPlan, fromExisting(), isPlan(), isReuse(), Plan, Reuse (+1 more)

## Ambiguous Edges - Review These
- `Project layout (src/app, lib/db, observability, crypto, schemas)` → `Google Search Console site-verification file`  [AMBIGUOUS]
  public/google81b6e6165b427f27.html · relation: conceptually_related_to

## Knowledge Gaps
- **404 isolated node(s):** `$schema`, `enabled`, `clientKind`, `useIgnoreFile`, `src/**` (+399 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 516 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Project layout (src/app, lib/db, observability, crypto, schemas)` and `Google Search Console site-verification file`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `cn()` connect `cn` to `runs-table.tsx`, `toast.tsx`, `document.ts`, `json-view.tsx`, `edit-credential-dialog.tsx`, `button.tsx`, `nav-user.tsx`, `pagination.tsx`, `utils.ts`, `query-status.tsx`, `ingest.ts`, `app/layout.tsx`, `PromptCard`, `lib/providers.ts`, `credentials-row.tsx`, `add-credential-dialog.tsx`, `run-detail.tsx`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Why does `config` connect `config/index.ts` to `cn`, `logger.ts`, `auth-request.ts`, `ingest.ts`, `app/layout.tsx`, `chat.ts`, `catalog.ts`, `vault.ts`, `queue/worker.ts`, `media/cookies.ts`, `[[...route]]/route.ts`, `rays.ts`, `server/runs.ts`, `admission.ts`, `notion.ts`, `db/index.ts`, `models.ts`, `verify-proxy.ts`, `verify-ytdlp.ts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `getDb()` connect `getDb` to `auth-request.ts`, `evidence.ts`, `chat.ts`, `pipeline.ts`, `prompts/page.tsx`, `catalog.ts`, `vault.ts`, `lib/runs.ts`, `media/cookies.ts`, `lib/settings.ts`, `[[...route]]/route.ts`, `server/runs.ts`, `admission.ts`, `[id]/page.tsx`, `db/index.ts`, `runs/page.tsx`, `extraction/route.ts`, `settings/page.tsx`, `synthesize.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `$schema`, `enabled`, `clientKind` to the rest of the system?**
  _404 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `runs-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13763440860215054 - nodes in this community are weakly interconnected._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.053998632946001365 - nodes in this community are weakly interconnected._
# Graph Report - relay  (2026-09-04)

## Corpus Check
- 308 files · ~250,637 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1946 nodes · 4740 edges · 146 communities (99 shown, 40 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `75b6330e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- query/agents.ts
- sidebar.tsx
- Troubleshooting
- proxy.ts
- profile-card.tsx
- run-stage-timeline.tsx
- scripts
- Relay production runbook
- resolve.ts
- biome.json
- button.tsx
- model-choice.ts
- cn
- compilerOptions
- transcription/index.ts
- lib/settings.ts
- [id]/page.tsx
- system-agents.ts
- download.ts
- app/layout.tsx
- import.ts
- catalog.ts
- settings/page.tsx
- extraction/index.ts
- Relay (PRD): short-form video to evidence-grounded Markdown
- components.json
- share-target.tsx
- schema.ts
- utils.ts
- chat.ts
- runs-table.tsx
- verify.ts
- SESSION_AUTH: server-side cookie capture for social sources
- pipeline.ts
- prompts/page.tsx
- Relay Changelog
- extraction/prompts.ts
- compose: capture service (Chromium, shm, seccomp)
- Relay for Android — Trusted Web Activity wrapper
- No hardcoding rule
- `auth_users`
- §3 Storage model (column mapping for a cookie credential)
- new-run-dialog.tsx
- schemas.ts
- pagination.tsx
- Egress proxy — YouTube from the production host
- admission.ts
- queue/worker.ts
- query-status.tsx
- Relay README (stack, setup, layout)
- Relay Brand Mark (logo.png)
- toast.tsx
- ingest.ts
- [[...route]]/route.ts
- import-session-dialog.tsx
- Gemini wired for extraction
- vault/page.tsx
- run-logs.ts
- auth-session.ts
- dependencies
- notion.ts
- runs/page.tsx
- getDb
- credentials-row.tsx
- json-view.tsx
- run-detail.tsx
- §7 Phased build plan (Phases 0-6)
- sources.ts
- lib/runs.ts
- query/credentials.ts
- free-port.ts
- privacy/page.tsx
- terms/page.tsx
- best-effort-json-parser
- better-auth
- provider-mark.tsx
- bullmq
- cookie-import-steps.tsx
- lib/providers.ts
- requireSession
- @dnd-kit/core
- query/settings.ts
- drizzle-orm
- screen-text.ts
- extraction/providers.ts
- @hugeicons/core-free-icons
- @hugeicons/react
- ioredis
- json-edit-react
- @libsql/client
- query/runs.ts
- next.config.ts
- next-themes
- evidence.ts
- @openobserve/browser-logs
- pino
- react
- react-dom
- react-resizable-panels
- @better-auth/drizzle-adapter
- tailwind-merge
- @tanstack/react-query
- @thesvg/react
- tw-animate-css
- zod
- postcss.config.mjs
- Biome for lint+format, tsc only for typecheck
- Generous scale (desktop command center sizing)
- @cfworker/json-schema
- rays.ts
- db/index.ts
- config/index.ts
- frames.ts
- class-variance-authority
- share/page.tsx
- synthesize.ts
- clsx
- @dnd-kit/sortable
- LauncherActivity
- sw.js
- gsap
- @gsap/react
- Application
- DelegationService
- gradlew
- next
- logger.ts
- @notionhq/client
- shadcn
- analysis.ts
- vault-select.ts
- logger
- providerLabel
- extraction/route.ts
- NavUser
- run-models.tsx
- agents/page.tsx
- YouTube
- EditCredentialDialog

## God Nodes (most connected - your core abstractions)
1. `cn()` - 236 edges
2. `getDb()` - 62 edges
3. `Button()` - 41 edges
4. `config` - 41 edges
5. `logger` - 35 edges
6. `providerLabel()` - 26 edges
7. `toast` - 21 edges
8. `Spinner()` - 19 edges
9. `requireSession()` - 18 edges
10. `runPipeline()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Component strictness: zero native form elements` --semantically_similar_to--> `UI rule: ShadCN components and HugeIcons only`  [INFERRED] [semantically similar]
  DESIGN.md → RULES.md
- `Evidence verification (Task 4.5)` --semantically_similar_to--> `Task 4.4-4.6: Extraction, Grounding & Notion Publishing`  [INFERRED] [semantically similar]
  LLM_STATE.md → CHANGELOG.md
- `Queue admission control (src/lib/queue/admission.ts)` --semantically_similar_to--> `§5.1 Capture concurrency cap and teardown`  [INFERRED] [semantically similar]
  LLM_STATE.md → SESSION_AUTH.md
- `ShadCN preset b5pFrsf5Vq (mira/zinc/emerald)` --semantically_similar_to--> `0.1.0 - Foundation & Database`  [INFERRED] [semantically similar]
  DESIGN.md → CHANGELOG.md
- `Modal shell over DialogContent (src/components/modal.tsx)` --references--> `UI rule: ShadCN components and HugeIcons only`  [INFERRED]
  LLM_STATE.md → RULES.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Queue admission control (three locks + deferral)** — llm_state_per_user_slot, llm_state_per_credential_jar_lock, llm_state_rate_budget_rolling_window, llm_state_deferral_moveto_delayed [EXTRACTED 1.00]
- **Session capture flow (mint ticket, stream, harvest, consume)** — session_auth_capture_own_process, session_auth_screencast_ws_security, session_auth_capture_provider_registry, session_auth_storage_model, session_auth_with_source_cookies [EXTRACTED 1.00]
- **Logo mark construction: arrow, stack, interlock and palette form one identity** — public_logo_relay_brand_mark, public_logo_play_triangle_motif, public_logo_stacked_bars_motif, public_logo_interlock_composition, public_logo_brand_palette [EXTRACTED 1.00]
- **Evidence grounding chain (transcript to published citation)** — prd_evidence_grounding, llm_state_transcription_gotchas, llm_state_evidence_contract_structural, llm_state_evidence_verification_4_5, llm_state_document_tree_notion_publish [INFERRED 0.85]
- **Relay Visual Identity System** — public_logo_relay_mark, public_logo_brand_palette, public_logo_relay_route_motif, public_logo_stacked_bars_motif, public_logo_app_icon_canvas [INFERRED 0.85]

## Communities (146 total, 40 thin omitted)

### Community 0 - "query/agents.ts"
Cohesion: 0.13
Nodes (22): AgentFormDialog(), onOpenChange(), initialModeFor(), AgentStatusToggle(), DeleteAgent(), AgentFormMode, DEFAULT_CONFIG, DEFAULT_SCHEMA (+14 more)

### Community 1 - "sidebar.tsx"
Cohesion: 0.06
Nodes (42): AppSidebar(), NAV, ProfileUser, ThemeToggle(), Separator(), Sheet(), SheetContent(), SheetDescription() (+34 more)

### Community 2 - "Troubleshooting"
Cohesion: 0.09
Nodes (21): 1. Sign in, 2. Go to the export page, 3. Export, 4. Upload, Before you start, Connecting a social account to Relay, Downloads worked, then started failing, Further reading (+13 more)

### Community 3 - "proxy.ts"
Cohesion: 0.24
Nodes (8): flushAll(), OpenObserveStream, skipRequestLog(), installShutdownHandlers(), config, proxy(), redact(), sendTrace()

### Community 4 - "profile-card.tsx"
Cohesion: 0.11
Nodes (28): PanelTone, TONE_TILE, AgentFormFields(), ChangePasswordForm(), Card(), CardContent(), CardDescription(), CardFooter() (+20 more)

### Community 5 - "run-stage-timeline.tsx"
Cohesion: 0.13
Nodes (19): formatFields(), LEVEL_TONE, RunLogLines(), timeFormat, Level, LEVELS, RANK, RunLogStream() (+11 more)

### Community 6 - "scripts"
Cohesion: 0.05
Nodes (37): @biomejs/biome, drizzle-kit, devDependencies, @biomejs/biome, drizzle-kit, tailwindcss, @tailwindcss/postcss, @types/bun (+29 more)

### Community 7 - "Relay production runbook"
Cohesion: 0.07
Nodes (26): 1. What is running, 2. The pipeline, 3. YouTube egress — the part most likely to break, 4.1 Read the run's own logs first, 4.2 Match the message, 4.3 Error classification, 4.4 The OpenObserve read path returns 401, 4.5 What is deliberately NOT shipped to OpenObserve (+18 more)

### Community 8 - "resolve.ts"
Cohesion: 0.16
Nodes (19): providers, TRANSCRIPTION_ORDER, transcriptionProvider, transcriptionProviderIds(), Candidate, candidates(), NoTranscriptionKeyError, runWhisperPair() (+11 more)

### Community 9 - "biome.json"
Cohesion: 0.06
Nodes (32): css, parser, next, react, files, includes, formatter, enabled (+24 more)

### Community 10 - "button.tsx"
Cohesion: 0.20
Nodes (19): DisabledActionSlot(), RetryRun(), TERMINAL, AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription() (+11 more)

### Community 11 - "model-choice.ts"
Cohesion: 0.32
Nodes (11): candidates(), resolveChain(), attemptPass(), ModelOption, pinnedModelsFor(), stageModels(), toOption(), chatProvider (+3 more)

### Community 12 - "cn"
Cohesion: 0.08
Nodes (38): Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), Breadcrumb(), BreadcrumbEllipsis() (+30 more)

### Community 13 - "compilerOptions"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, next.config.ts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts (+22 more)

### Community 14 - "transcription/index.ts"
Cohesion: 0.28
Nodes (11): NormalisedTranscript, EnglishStream, Transcription, isMostlyLatin(), latinRatio(), RomanStream, toRomanScript(), hasSpeech() (+3 more)

### Community 15 - "lib/settings.ts"
Cohesion: 0.22
Nodes (17): CHAT_STAGE_IDS, extractionChainSchema, shareAutoRunSchema, stageModelSchema, allCredentialChains(), cleanIds(), forgetCredentialChain(), getCredentialChain() (+9 more)

### Community 16 - "[id]/page.tsx"
Cohesion: 0.20
Nodes (9): metadata, dynamic, metadata, Params, RunPage(), ShellContent(), ShellHeader(), DashboardNotFoundPanel() (+1 more)

### Community 17 - "system-agents.ts"
Cohesion: 0.20
Nodes (8): SchemaFragment, PLACE_PROMPT, PLACE_SCHEMA, RECIPE_PROMPT, RECIPE_SCHEMA, SynthesizedAgent, SYSTEM_AGENTS, SystemAgentDefinition

### Community 18 - "download.ts"
Cohesion: 0.16
Nodes (21): Classification, classifyFailure(), LADDER, rank(), Rung, YtDlpAttempt, attemptClientChain(), DownloadResult (+13 more)

### Community 19 - "app/layout.tsx"
Cohesion: 0.09
Nodes (24): fontMono, metadata, oxaniumHeading, RootLayout(), spaceGrotesk, viewport, ServiceWorker(), ErrorBoundaryState (+16 more)

### Community 20 - "import.ts"
Cohesion: 0.19
Nodes (16): MediaSourceId, SocialProviderInfo, assertSerializable(), inScope(), isComplete(), SerializedJar, toNetscapeJar(), CookieImportError (+8 more)

### Community 21 - "catalog.ts"
Cohesion: 0.26
Nodes (13): CachedCatalog, catalogFor(), fetchModels(), readCache(), resolve(), warm(), writeCache(), CatalogModel (+5 more)

### Community 22 - "settings/page.tsx"
Cohesion: 0.22
Nodes (11): dynamic, metadata, SettingsPage(), VaultData(), QueryProvider(), SecurityCard(), authAccounts, getQueryClient() (+3 more)

### Community 23 - "extraction/index.ts"
Cohesion: 0.21
Nodes (16): compactSchemaForPrompt(), asObject(), buildSystem(), extract(), Extraction, ExtractionError, formatTranscript(), Routing (+8 more)

### Community 24 - "Relay (PRD): short-form video to evidence-grounded Markdown"
Cohesion: 0.15
Nodes (17): Task 4.4-4.6: Extraction, Grounding & Notion Publishing, Document tree and Notion publish (Task 4.6), Evidence verification (Task 4.5), Groq free-tier TPM pressure and mitigations, Media ingest gotchas (ffmpeg exit 8, Bun $ newline, rm no-op), OpenRouter is 6-15x slower than Groq, Transcription gotchas (Whisper fabrication, no_speech_prob gate), Agent routing & extraction (System / Human agents) (+9 more)

### Community 25 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 26 - "share-target.tsx"
Cohesion: 0.19
Nodes (16): clearPendingShare(), readPendingShare(), StoredShare, writePendingShare(), candidates(), resolveShare(), SharePayload, ShareResolution (+8 more)

### Community 27 - "schema.ts"
Cohesion: 0.10
Nodes (19): Agent, authSessions, authUsers, authVerifications, Credential, NewAgent, NewCredential, NewRelayRun (+11 more)

### Community 28 - "utils.ts"
Cohesion: 0.16
Nodes (14): SOURCE_ICON, SourceIcon(), TAB_ACCENT, Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger() (+6 more)

### Community 29 - "chat.ts"
Cohesion: 0.16
Nodes (20): attemptKey(), AttemptOptions, ChatRun, KeyAttempt, exhausted(), ChatExhaustedError, describeSkipped(), disposition (+12 more)

### Community 30 - "runs-table.tsx"
Cohesion: 0.13
Nodes (20): AGENT_COLUMNS, dateFormat, TypeBadge(), DataColumn, DataTable(), QueryErrorState(), canRetry(), RunDetailHeader() (+12 more)

### Community 31 - "verify.ts"
Cohesion: 0.18
Nodes (13): normalise(), normaliseTranscript(), check(), contentWords(), Finding, isRecord(), pointerSegment(), score() (+5 more)

### Community 32 - "SESSION_AUTH: server-side cookie capture for social sources"
Cohesion: 0.13
Nodes (21): Queue admission control (src/lib/queue/admission.ts), Source-scoped binary preflight (ensureMediaBinaries), Capture security model (loopback CDP, ticket, fenced navigation), Deferral via moveToDelayed + DelayedError, Deferred: social cookie credentials (2026-08-31 decision), Instagram unblocked via instaloader, Per-user slot semaphore (fairness), Per-credential rate budget as a rolling window (+13 more)

### Community 33 - "pipeline.ts"
Cohesion: 0.21
Nodes (16): analysisRecord(), VerificationSummary, verifyExtraction(), RunContext, setRunStage(), storage, withRunContext(), codeOf() (+8 more)

### Community 34 - "prompts/page.tsx"
Cohesion: 0.16
Nodes (15): dynamic, metadata, PromptsData(), PromptCard(), PromptsList(), CARDS, PromptsSkeleton(), listPrompts() (+7 more)

### Community 35 - "Relay Changelog"
Cohesion: 0.10
Nodes (21): 0.1.0 - Foundation & Database, 0.2.0 - Credentials Dashboard & Notion Ray, 0.3.0 - Coolify deployment & Drizzle Gateway, Authentication & Observability (Better Auth, Pino, Rays rebrand), Relay Changelog, Component strictness: zero native form elements, GSAP animation standards (useGSAP, guarded refs), OpenObserve observability (client RUM + server logs) (+13 more)

### Community 36 - "extraction/prompts.ts"
Cohesion: 0.22
Nodes (17): cached(), cacheKeys, client(), get(), globalForCache, invalidate(), keyFor(), put() (+9 more)

### Community 37 - "compose: capture service (Chromium, shm, seccomp)"
Cohesion: 0.14
Nodes (20): Deployment: deps/builder/runtime Dockerfile stages, CAPTURE_INTERNAL_TOKEN (dedicated inter-service secret), compose: capture service (Chromium, shm, seccomp), compose: dragonfly service (pinned, allow-undeclared-keys), compose: json-file log rotation on every service, compose: relay service (target runtime), compose: worker service (init, health, cache-hit args), Capture browser launch prerequisites (xauth, chromium-sandbox, seccomp) (+12 more)

### Community 38 - "Relay for Android — Trusted Web Activity wrapper"
Cohesion: 0.18
Nodes (10): 1. Prerequisites, 2. The release signing key, 3. Build, 4. Verify before shipping, 5. Two ordering rules that bite, 6. Rotating the signing key, 7. Releasing a new version, Bubblewrap manifest gotchas (+2 more)

### Community 39 - "No hardcoding rule"
Cohesion: 0.22
Nodes (9): Three-tier link icon resolution, Per-credential jar lock (correctness), Jar write-back on a FAILED download (bug), No hardcoding rule, Rays are provider-generic (registry, generic account_* keys), §2.4 CaptureProvider registry (provider-generic), §2.5 Capture routes (/capture/:provider, finish, cancel), §4.2 Jar rotation write-back (--cookies is read-write) (+1 more)

### Community 40 - "`auth_users`"
Cohesion: 0.17
Nodes (10): `agents`, `auth_accounts`, `auth_sessions`, `auth_users`, `auth_verifications`, `credentials`, `relay_runs`, `model_catalog` (+2 more)

### Community 41 - "§3 Storage model (column mapping for a cookie credential)"
Cohesion: 0.19
Nodes (14): BYOK encrypted credential vault, Security rule: encrypted tokens, plaintext meta_data, never logged, §3.2 expires_at is a floor on uselessness, §3.6 getSecretByType (vault widening), §4.4 Capture logging allowlist, §3.3 What must never enter meta_data, §3.5 Migration: NONE (Drizzle enum is TypeScript-level), §3.4 Reconnect works with no new code (+6 more)

### Community 42 - "new-run-dialog.tsx"
Cohesion: 0.15
Nodes (18): ACCENT, ModalAccent, ModalProps, ModalSize, SIZE, ModePicker(), MODES, Dialog() (+10 more)

### Community 43 - "schemas.ts"
Cohesion: 0.11
Nodes (23): credentials, AgentInput, agentInputSchema, agentUpdateSchema, CookieImportInput, cookieImportSchema, credentialActiveSchema, credentialInputSchema (+15 more)

### Community 44 - "pagination.tsx"
Cohesion: 0.24
Nodes (12): PageSlot, pageWindow(), RunsPagination(), buttonVariants, Pagination(), PaginationContent(), PaginationEllipsis(), PaginationItem() (+4 more)

### Community 45 - "Egress proxy — YouTube from the production host"
Cohesion: 0.10
Nodes (19): 1. The measurement this exists for, 1a. The trap that cost an afternoon — and the wrong lesson drawn from it, 2. How it is wired, 3. THE MANUAL STEP, AND WHY THERE ISN'T ONE ANY MORE, 4. Operating it, 5. Failure modes and what they mean, 6. Security notes, 7. Open questions and honest caveats (+11 more)

### Community 46 - "admission.ts"
Cohesion: 0.32
Nodes (12): acquire(), acquireUserSlot(), Admission, admitRun(), budgetKey(), chargeBudget(), checkWindow(), credentialLockKey() (+4 more)

### Community 47 - "queue/worker.ts"
Cohesion: 0.18
Nodes (14): worker, processRun(), createRedis(), getRedis(), getRunLogRedis(), globalForRedis, globalForRunLogs, startWorkerHealthServer() (+6 more)

### Community 48 - "query-status.tsx"
Cohesion: 0.20
Nodes (17): ROWS, QueryStatusBar(), QueryStatusBarProps, QueryStatusBarSkeleton(), relative, updatedAgo(), ROWS, Skeleton() (+9 more)

### Community 49 - "Relay README (stack, setup, layout)"
Cohesion: 0.22
Nodes (9): Next.js Agent Rules (read node_modules docs first), The stale-worker trap, Google Search Console site-verification file, Project layout (src/app, lib/db, observability, crypto, schemas), Relay README (stack, setup, layout), Relay stack table (Bun, Next.js, Hono, Drizzle, Zod, Biome), Circuit breakers (3 files/step, typecheck gate, stop for approval), Code hygiene: 250-line cap and backend naming (+1 more)

### Community 50 - "Relay Brand Mark (logo.png)"
Cohesion: 0.33
Nodes (11): Public Static App Icon Asset, Square 1024x1024 App-Icon Canvas, Brand Palette: Emerald Green + Navy Accent on White, Arrow-Into-Stack Interlock Composition, Media Relay / Extraction Product Identity, Play / Forward-Arrow Triangle Motif, Relay Brand Mark (logo.png), Relay (Brand Name) (+3 more)

### Community 51 - "toast.tsx"
Cohesion: 0.17
Nodes (7): TOAST_TYPE_STYLES, ToastAction(), ToastClose(), ToastContent(), ToastDescription(), ToastTitle(), ToastViewport()

### Community 52 - "ingest.ts"
Cohesion: 0.15
Nodes (19): BINARIES, BinarySpec, BinaryVersions, detectBinary(), detected, ensureMediaBinaries(), firstLine(), MediaBinaryError (+11 more)

### Community 53 - "[[...route]]/route.ts"
Cohesion: 0.11
Nodes (20): app, DELETE, GET, PATCH, POST, PUT, PromptKey, updatePrompt() (+12 more)

### Community 54 - "import-session-dialog.tsx"
Cohesion: 0.16
Nodes (11): ACCENT, FALLBACK, RunStatusBadge(), Badge(), badgeVariants, Textarea(), ConnectRail(), RailStep (+3 more)

### Community 55 - "Gemini wired for extraction"
Cohesion: 0.18
Nodes (14): Agent sprawl: the router was the cause, disposition(): 5xx is next-model, not fail, The evidence contract is structural, not requested, Planned Task 4.3b: frame/vision extraction (amends PRD §5), Gemini wired for extraction, The gemma `excludes` wrong turn, isolate() and the unterminated trailing fence, Capability-driven model ranking heuristics (+6 more)

### Community 56 - "vault/page.tsx"
Cohesion: 0.29
Nodes (8): dynamic, metadata, VaultPage(), CredentialsTableSkeleton(), VaultActions(), VaultNotices(), credentialKeys, configuredRayIds()

### Community 57 - "run-logs.ts"
Cohesion: 0.19
Nodes (13): LEVEL_NAMES, RunLogStream, appendRunLog(), dropRunLogs(), DROPPED, LEVEL_NAME, levelName(), readRunLogsHistory() (+5 more)

### Community 58 - "auth-session.ts"
Cohesion: 0.19
Nodes (12): { GET, POST }, Home(), LandingPage(), marquee, MARQUEE_LOOP, stories, auth, authSchema (+4 more)

### Community 59 - "dependencies"
Cohesion: 0.22
Nodes (9): @base-ui/react, @dnd-kit/utilities, hono, @openobserve/browser-rum, dependencies, @base-ui/react, @dnd-kit/utilities, hono (+1 more)

### Community 60 - "notion.ts"
Cohesion: 0.06
Nodes (50): ClaimFinding, REASON_TEXT, Item(), RunExtraction(), countEvidence(), Evidence, evidenceRange(), ExtractedField (+42 more)

### Community 61 - "runs/page.tsx"
Cohesion: 0.33
Nodes (6): dynamic, metadata, QueuePage(), RunsData(), RunsTableSkeleton(), listRuns()

### Community 62 - "getDb"
Cohesion: 0.41
Nodes (10): DuplicateAgentNameError, nameTaken(), createAgent(), deleteAgent(), listAgents(), setAgentActive(), toSummary(), updateAgent() (+2 more)

### Community 63 - "credentials-row.tsx"
Cohesion: 0.24
Nodes (15): accountEmailFor(), accountNameFor(), dateFormat, displayName(), metaString(), ProviderTile(), ReconnectSession(), RowActions() (+7 more)

### Community 64 - "json-view.tsx"
Cohesion: 0.27
Nodes (7): JsonPanel(), onCopy(), useCollapseAll(), JSON_EDITOR_BASE, THEME, JsonInput(), JsonView()

### Community 65 - "run-detail.tsx"
Cohesion: 0.08
Nodes (33): ExternalLink(), hostOf(), Linkify(), Token, tokenize(), PublishedPanel(), dateFormat, RunDetail() (+25 more)

### Community 66 - "§7 Phased build plan (Phases 0-6)"
Cohesion: 0.17
Nodes (16): Explicit Clone replaces copy-on-write for System agents, additional_data reduced to a derived `stale` boolean, Modal shell over DialogContent (src/components/modal.tsx), Phase 0: YouTube GVS 403 and player_client fallbacks, SESSION_EXPIRED classification (Phase 4), Turso/libSQL adoption and non-automatic migrations, bun run verify:ytdlp acceptance test, Bun-first mandate (Bun-native and Web-standard APIs) (+8 more)

### Community 67 - "sources.ts"
Cohesion: 0.21
Nodes (11): Brand, BRANDS, faviconFor(), LinkIcon(), secondLevel(), MEDIA_SOURCES, MediaPattern, MediaPatternBase (+3 more)

### Community 68 - "lib/runs.ts"
Cohesion: 0.23
Nodes (13): RunData(), AnalysisMode, RunStatus, sourceLabel(), createRun(), getRun(), RunDetail, RunPage (+5 more)

### Community 69 - "query/credentials.ts"
Cohesion: 0.14
Nodes (14): DeleteCredential(), CredentialType, credentialsQueryOptions(), fetchCredentials(), SetCredentialActiveVariables, UpdateCredentialVariables, useDeleteCredential(), API_BASE (+6 more)

### Community 75 - "provider-mark.tsx"
Cohesion: 0.19
Nodes (14): ProviderMark(), ChainEntryRow, ChainEntryRowProps, ProviderPicker(), PROVIDER_MARKS, providerIcon, providerIconVariant(), ProviderIconWithVariant (+6 more)

### Community 77 - "cookie-import-steps.tsx"
Cohesion: 0.21
Nodes (11): BrowserGuide, BROWSERS, ConnectPlatform, DEFAULT_GUIDE, FIREFOX_ANDROID_STORE, useBrowserGuide(), CopyableUrl(), Note() (+3 more)

### Community 78 - "lib/providers.ts"
Cohesion: 0.17
Nodes (11): ProviderCard(), ProviderCardProps, RayProviderGrid(), SocialProviderGrid(), AI_KEY_PROVIDERS, ALL_PROVIDERS, PROVIDER_IDS, RAY_PROVIDERS (+3 more)

### Community 79 - "requireSession"
Cohesion: 0.29
Nodes (9): AgentsPage(), DashboardCatchAll(), generateMetadata(), Params, sectionTitle(), titleCase(), DashboardLayout(), PromptsPage() (+1 more)

### Community 81 - "query/settings.ts"
Cohesion: 0.13
Nodes (24): accountFor(), ChainList(), contextLabel(), ModelPicker(), ShareCard(), StagePriorityCard(), StageTabContent(), ChainEntry (+16 more)

### Community 83 - "screen-text.ts"
Cohesion: 0.27
Nodes (11): Analysis, ContactSheet, VISION_SCHEMA, VISION_SYSTEM, visionUserPrompt(), oneLine(), readScreenText(), ScreenReading (+3 more)

### Community 84 - "extraction/providers.ts"
Cohesion: 0.18
Nodes (14): asArray(), asNumber(), isFree(), normaliseCatalog(), normaliseModel(), parameterCount(), rankModels(), sizeScore() (+6 more)

### Community 90 - "query/runs.ts"
Cohesion: 0.23
Nodes (11): DeleteRun(), fetchRun(), fetchRuns(), hasActiveRuns(), runDetailQueryOptions(), RunLogs, runsQueryOptions(), useDeleteRun() (+3 more)

### Community 93 - "evidence.ts"
Cohesion: 0.18
Nodes (11): COMPACT_EVIDENCE, Evidence, EVIDENCE_SCHEMA, EvidenceKind, isEvidence(), isTranscriptEvidence(), isVisualEvidence(), TRANSCRIPT_EVIDENCE_SCHEMA (+3 more)

### Community 111 - "rays.ts"
Cohesion: 0.26
Nodes (10): RayProviderId, rayCallbackSchema, getProvider(), isConfigured(), providers, RayProvider, redirectUri(), stateCookieName() (+2 more)

### Community 112 - "db/index.ts"
Cohesion: 0.14
Nodes (12): db, indexes, raw, tables, encrypt(), EncryptedPayload, getMasterKey(), { construct } (+4 more)

### Community 113 - "config/index.ts"
Cohesion: 0.11
Nodes (12): attempt(), CHAIN, FIXTURES, label(), main(), LoginForm(), metadata, metadata (+4 more)

### Community 114 - "frames.ts"
Cohesion: 0.35
Nodes (10): lastLine(), buildContactSheet(), Cut, fetchVideo(), pickTimes(), probeDuration(), scanCuts(), runYtDlp() (+2 more)

### Community 116 - "share/page.tsx"
Cohesion: 0.27
Nodes (7): ExistingRun, metadata, SharePage(), ShareExisting(), relayRuns, findLatestRunForUrl(), getShareAutoRun()

### Community 117 - "synthesize.ts"
Cohesion: 0.31
Nodes (9): compile(), describe(), FieldPlan, fromExisting(), isPlan(), isReuse(), Plan, Reuse (+1 more)

### Community 120 - "LauncherActivity"
Cohesion: 0.48
Nodes (4): android.net.Uri, android.os.Bundle, Override, LauncherActivity

### Community 121 - "sw.js"
Cohesion: 0.33
Nodes (4): cacheFirst(), isImmutable(), OWNED_CACHES, PRECACHE_URLS

### Community 127 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 132 - "logger.ts"
Cohesion: 0.10
Nodes (22): Check, checks, FAILURE_SHAPES, leaks, logRecord, serialized, openObserveMiddleware(), traceBody() (+14 more)

### Community 136 - "analysis.ts"
Cohesion: 0.36
Nodes (7): analyseMedia(), NoFrameTextError, readFrames(), contactSheetForRun(), descriptionOf(), titleOf(), transcribe()

### Community 137 - "vault-select.ts"
Cohesion: 0.40
Nodes (9): decrypt(), accessTokenById(), applyOrder(), getAccessToken(), orderCredentials(), orderedProviderKeys(), pickCredential(), ProviderKey (+1 more)

### Community 138 - "logger"
Cohesion: 0.36
Nodes (8): persistRotation(), SourceCookies, withSourceCookies(), logger, getSecretByType(), recordSessionOutcome(), StoredSecret, updateCredentialSecret()

### Community 139 - "providerLabel"
Cohesion: 0.33
Nodes (6): CredentialActiveToggle(), describe(), ImportSessionDialog(), providerLabel(), useSetCredentialActive(), useImportCookies()

### Community 140 - "extraction/route.ts"
Cohesion: 0.42
Nodes (8): classify(), forRouting(), requestedAgent(), routableAgents(), routeAgent(), RoutingMode, toRouting(), seedSystemAgents()

### Community 141 - "NavUser"
Cohesion: 0.32
Nodes (5): NavUser(), ProfileCard(), AVATAR_GRADIENTS, avatarGradient(), initials()

### Community 142 - "run-models.tsx"
Cohesion: 0.29
Nodes (6): MODE_LABEL, Phase, phasesFrom(), ProviderChip(), RunModels(), STAGE_BAR

### Community 143 - "agents/page.tsx"
Cohesion: 0.29
Nodes (6): AgentsData(), dynamic, metadata, AgentsTable(), AgentsTableSkeleton(), agentKeys

### Community 144 - "YouTube"
Cohesion: 0.33
Nodes (6): 1. Open a private window, 2. Sign in to YouTube, 3. Navigate to robots.txt — in the same tab, 4. Export, then close the window immediately, 5. Upload, YouTube

### Community 145 - "EditCredentialDialog"
Cohesion: 0.60
Nodes (5): currentAccount(), EditCredentialDialog(), reset(), submit(), useUpdateCredential()

## Ambiguous Edges - Review These
- `Project layout (src/app, lib/db, observability, crypto, schemas)` → `Google Search Console site-verification file`  [AMBIGUOUS]
  public/google81b6e6165b427f27.html · relation: conceptually_related_to

## Knowledge Gaps
- **440 isolated node(s):** `$schema`, `enabled`, `clientKind`, `useIgnoreFile`, `src/**` (+435 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 568 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Project layout (src/app, lib/db, observability, crypto, schemas)` and `Google Search Console site-verification file`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `cn()` connect `cn` to `query/agents.ts`, `sidebar.tsx`, `profile-card.tsx`, `run-stage-timeline.tsx`, `button.tsx`, `providerLabel`, `run-models.tsx`, `app/layout.tsx`, `share-target.tsx`, `utils.ts`, `runs-table.tsx`, `prompts/page.tsx`, `new-run-dialog.tsx`, `pagination.tsx`, `query-status.tsx`, `toast.tsx`, `import-session-dialog.tsx`, `notion.ts`, `credentials-row.tsx`, `json-view.tsx`, `run-detail.tsx`, `sources.ts`, `provider-mark.tsx`, `lib/providers.ts`, `query/settings.ts`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `config` connect `config/index.ts` to `sidebar.tsx`, `logger.ts`, `model-choice.ts`, `download.ts`, `app/layout.tsx`, `catalog.ts`, `chat.ts`, `extraction/prompts.ts`, `schemas.ts`, `admission.ts`, `queue/worker.ts`, `ingest.ts`, `[[...route]]/route.ts`, `run-logs.ts`, `auth-session.ts`, `notion.ts`, `sources.ts`, `query/credentials.ts`, `extraction/providers.ts`, `rays.ts`, `db/index.ts`, `frames.ts`, `share/page.tsx`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `logger` connect `logger` to `logger.ts`, `analysis.ts`, `resolve.ts`, `model-choice.ts`, `transcription/index.ts`, `lib/settings.ts`, `download.ts`, `catalog.ts`, `extraction/index.ts`, `chat.ts`, `pipeline.ts`, `extraction/prompts.ts`, `schemas.ts`, `admission.ts`, `queue/worker.ts`, `ingest.ts`, `[[...route]]/route.ts`, `notion.ts`, `getDb`, `screen-text.ts`, `rays.ts`, `frames.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `$schema`, `enabled`, `clientKind` to the rest of the system?**
  _440 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `query/agents.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13227513227513227 - nodes in this community are weakly interconnected._
- **Should `sidebar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0593990216631726 - nodes in this community are weakly interconnected._
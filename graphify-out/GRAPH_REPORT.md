# Graph Report - relay  (2026-09-04)

## Corpus Check
- 311 files · ~254,146 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1982 nodes · 4828 edges · 141 communities (93 shown, 41 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6ad8024a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- query/agents.ts
- sidebar.tsx
- Troubleshooting
- scripts/worker.ts
- profile-card.tsx
- run-stage-timeline.tsx
- scripts
- Relay production runbook
- resolve.ts
- biome.json
- button.tsx
- chat.ts
- cn
- compilerOptions
- transcription/index.ts
- lib/settings.ts
- [id]/page.tsx
- overview.ts
- ingest.ts
- app/layout.tsx
- import.ts
- notion.ts
- run-facts.tsx
- extraction/index.ts
- Relay (PRD): short-form video to evidence-grounded Markdown
- components.json
- share/page.tsx
- schema.ts
- utils.ts
- chat-attempt.ts
- credentials-row.tsx
- verify.ts
- SESSION_AUTH: server-side cookie capture for social sources
- logger
- prompts/page.tsx
- Relay Changelog
- catalog.ts
- compose: capture service (Chromium, shm, seccomp)
- Relay for Android — Trusted Web Activity wrapper
- No hardcoding rule
- `auth_users`
- §3 Storage model (column mapping for a cookie credential)
- new-run-dialog.tsx
- vault.ts
- pagination.tsx
- Egress proxy — YouTube from the production host
- admission.ts
- queue/worker.ts
- getDb
- Relay README (stack, setup, layout)
- Relay Brand Mark (logo.png)
- toast.tsx
- facts.ts
- [[...route]]/route.ts
- run-status-badge.tsx
- Gemini wired for extraction
- settings/page.tsx
- run-logs.ts
- auth-session.ts
- dependencies
- document.ts
- runs/page.tsx
- lib/agents.ts
- schema-pipeline.ts
- json-view.tsx
- run-detail.tsx
- §7 Phased build plan (Phases 0-6)
- notion-guides.ts
- lib/runs.ts
- skip-paths.ts
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
- models.ts
- @hugeicons/core-free-icons
- @hugeicons/react
- ioredis
- json-edit-react
- @libsql/client
- query/runs.ts
- next.config.ts
- next-themes
- verify-ytdlp.ts
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
- schemas.ts
- db/index.ts
- config/index.ts
- login/page.tsx
- class-variance-authority
- share-target.tsx
- extraction/providers.ts
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
- vault-select.ts
- model-picker.tsx
- run-models.tsx
- agents/page.tsx
- YouTube

## God Nodes (most connected - your core abstractions)
1. `cn()` - 236 edges
2. `getDb()` - 65 edges
3. `config` - 42 edges
4. `Button()` - 41 edges
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
- `0.3.0 - Coolify deployment & Drizzle Gateway` --references--> `compose: relay service (target runtime)`  [INFERRED]
  CHANGELOG.md → docker-compose.yml

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Queue admission control (three locks + deferral)** — llm_state_per_user_slot, llm_state_per_credential_jar_lock, llm_state_rate_budget_rolling_window, llm_state_deferral_moveto_delayed [EXTRACTED 1.00]
- **Session capture flow (mint ticket, stream, harvest, consume)** — session_auth_capture_own_process, session_auth_screencast_ws_security, session_auth_capture_provider_registry, session_auth_storage_model, session_auth_with_source_cookies [EXTRACTED 1.00]
- **Logo mark construction: arrow, stack, interlock and palette form one identity** — public_logo_relay_brand_mark, public_logo_play_triangle_motif, public_logo_stacked_bars_motif, public_logo_interlock_composition, public_logo_brand_palette [EXTRACTED 1.00]
- **Evidence grounding chain (transcript to published citation)** — prd_evidence_grounding, llm_state_transcription_gotchas, llm_state_evidence_contract_structural, llm_state_evidence_verification_4_5, llm_state_document_tree_notion_publish [INFERRED 0.85]
- **Relay Visual Identity System** — public_logo_relay_mark, public_logo_brand_palette, public_logo_relay_route_motif, public_logo_stacked_bars_motif, public_logo_app_icon_canvas [INFERRED 0.85]

## Communities (141 total, 41 thin omitted)

### Community 0 - "query/agents.ts"
Cohesion: 0.13
Nodes (22): AgentFormDialog(), onOpenChange(), initialModeFor(), AgentStatusToggle(), DeleteAgent(), AgentFormMode, DEFAULT_CONFIG, DEFAULT_SCHEMA (+14 more)

### Community 1 - "sidebar.tsx"
Cohesion: 0.06
Nodes (42): AppSidebar(), NAV, ProfileUser, ThemeToggle(), Separator(), Sheet(), SheetContent(), SheetDescription() (+34 more)

### Community 2 - "Troubleshooting"
Cohesion: 0.09
Nodes (21): 1. Sign in, 2. Go to the export page, 3. Export, 4. Upload, Before you start, Connecting a social account to Relay, Downloads worked, then started failing, Further reading (+13 more)

### Community 3 - "scripts/worker.ts"
Cohesion: 0.27
Nodes (5): worker, flushAll(), OpenObserveStream, startWorkerHealthServer(), installShutdownHandlers()

### Community 4 - "profile-card.tsx"
Cohesion: 0.18
Nodes (13): PanelTone, TONE_TILE, ChangePasswordForm(), Card(), CardAction(), CardContent(), CardDescription(), CardFooter() (+5 more)

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
Cohesion: 0.15
Nodes (20): AiKeyProviderId, providers, TRANSCRIPTION_ORDER, transcriptionProvider, transcriptionProviderIds(), Candidate, candidates(), NoTranscriptionKeyError (+12 more)

### Community 9 - "biome.json"
Cohesion: 0.06
Nodes (32): css, parser, next, react, files, includes, formatter, enabled (+24 more)

### Community 10 - "button.tsx"
Cohesion: 0.12
Nodes (31): ACCENT, Modal(), ModalAccent, ModalProps, ModalSize, SIZE, ACCENT, FALLBACK (+23 more)

### Community 11 - "chat.ts"
Cohesion: 0.32
Nodes (12): candidates(), resolveChain(), ChatRun, attemptPass(), PassResult, ModelOption, pinnedModelsFor(), stageModels() (+4 more)

### Community 12 - "cn"
Cohesion: 0.10
Nodes (30): AlertDialogMedia(), AlertDialogOverlay(), Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage() (+22 more)

### Community 13 - "compilerOptions"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, next.config.ts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts (+22 more)

### Community 14 - "transcription/index.ts"
Cohesion: 0.26
Nodes (13): Analysis, EnglishStream, transcribe(), Transcription, isMostlyLatin(), latinRatio(), RomanStream, toRomanScript() (+5 more)

### Community 15 - "lib/settings.ts"
Cohesion: 0.20
Nodes (19): CHAT_STAGE_IDS, extractionChainSchema, shareAutoRunSchema, stageModelSchema, allCredentialChains(), cleanIds(), forgetCredentialChain(), getCredentialChain() (+11 more)

### Community 16 - "[id]/page.tsx"
Cohesion: 0.20
Nodes (9): metadata, dynamic, metadata, Params, RunPage(), ShellContent(), ShellHeader(), DashboardNotFoundPanel() (+1 more)

### Community 17 - "overview.ts"
Cohesion: 0.18
Nodes (16): buildKpis(), Kpis, percentiles, runsPerDay(), successRate(), ANALYTICS_RANGE_IDS, ANALYTICS_RANGES, AnalyticsRange (+8 more)

### Community 18 - "ingest.ts"
Cohesion: 0.05
Nodes (69): Brand, BRANDS, faviconFor(), LinkIcon(), secondLevel(), SOURCE_ICON, SourceIcon(), BINARIES (+61 more)

### Community 19 - "app/layout.tsx"
Cohesion: 0.09
Nodes (24): fontMono, metadata, oxaniumHeading, RootLayout(), spaceGrotesk, viewport, ServiceWorker(), ErrorBoundaryState (+16 more)

### Community 20 - "import.ts"
Cohesion: 0.19
Nodes (16): MediaSourceId, SocialProviderInfo, assertSerializable(), inScope(), isComplete(), SerializedJar, toNetscapeJar(), CookieImportError (+8 more)

### Community 21 - "notion.ts"
Cohesion: 0.18
Nodes (15): DocNode, RelayDocument, factLine(), NotionBlock, richText(), TextOptions, toBlocks(), toNotionBlocks() (+7 more)

### Community 22 - "run-facts.tsx"
Cohesion: 0.18
Nodes (13): RunDetail(), Fact, FactList(), numberFormat, processingFacts(), seconds(), sourceFacts(), text() (+5 more)

### Community 23 - "extraction/index.ts"
Cohesion: 0.06
Nodes (57): exhausted(), ChatExhaustedError, NoExtractionKeyError, runChat(), COMPACT_EVIDENCE, compactSchemaForPrompt(), Evidence, EVIDENCE_SCHEMA (+49 more)

### Community 24 - "Relay (PRD): short-form video to evidence-grounded Markdown"
Cohesion: 0.15
Nodes (17): Task 4.4-4.6: Extraction, Grounding & Notion Publishing, Document tree and Notion publish (Task 4.6), Evidence verification (Task 4.5), Groq free-tier TPM pressure and mitigations, Media ingest gotchas (ffmpeg exit 8, Bun $ newline, rm no-op), OpenRouter is 6-15x slower than Groq, Transcription gotchas (Whisper fabrication, no_speech_prob gate), Agent routing & extraction (System / Human agents) (+9 more)

### Community 25 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 26 - "share/page.tsx"
Cohesion: 0.20
Nodes (13): metadata, SharePage(), candidates(), resolveShare(), SharePayload, ShareResolution, SharePanel(), rejectionMessage() (+5 more)

### Community 27 - "schema.ts"
Cohesion: 0.14
Nodes (12): ModePicker(), MODES, Agent, authSessions, authVerifications, Credential, NewAgent, NewCredential (+4 more)

### Community 28 - "utils.ts"
Cohesion: 0.23
Nodes (11): TAB_ACCENT, Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), AddCredentialDialog(), PANEL (+3 more)

### Community 29 - "chat-attempt.ts"
Cohesion: 0.16
Nodes (21): attemptKey(), AttemptOptions, KeyAttempt, disposition, MAX_CANDIDATES, retryAfterMs(), SkippedModel, looksLikeImageRefusal() (+13 more)

### Community 30 - "credentials-row.tsx"
Cohesion: 0.05
Nodes (70): DisabledActionSlot(), AGENT_COLUMNS, dateFormat, ROWS, TypeBadge(), DataColumn, DataTable(), QueryErrorState() (+62 more)

### Community 31 - "verify.ts"
Cohesion: 0.16
Nodes (15): normalise(), NormalisedTranscript, normaliseTranscript(), check(), contentWords(), Finding, isRecord(), pointerSegment() (+7 more)

### Community 32 - "SESSION_AUTH: server-side cookie capture for social sources"
Cohesion: 0.13
Nodes (21): Queue admission control (src/lib/queue/admission.ts), Source-scoped binary preflight (ensureMediaBinaries), Capture security model (loopback CDP, ticket, fenced navigation), Deferral via moveToDelayed + DelayedError, Deferred: social cookie credentials (2026-08-31 decision), Instagram unblocked via instaloader, Per-user slot semaphore (fairness), Per-credential rate budget as a rolling window (+13 more)

### Community 33 - "logger"
Cohesion: 0.17
Nodes (22): analyseMedia(), analysisRecord(), NoFrameTextError, readFrames(), describeSkipped(), verifyExtraction(), logger, RunContext (+14 more)

### Community 34 - "prompts/page.tsx"
Cohesion: 0.18
Nodes (13): dynamic, metadata, PromptsPage(), PromptCard(), PromptsList(), CARDS, PromptsSkeleton(), promptKeys (+5 more)

### Community 35 - "Relay Changelog"
Cohesion: 0.10
Nodes (21): 0.1.0 - Foundation & Database, 0.2.0 - Credentials Dashboard & Notion Ray, 0.3.0 - Coolify deployment & Drizzle Gateway, Authentication & Observability (Better Auth, Pino, Rays rebrand), Relay Changelog, Component strictness: zero native form elements, GSAP animation standards (useGSAP, guarded refs), OpenObserve observability (client RUM + server logs) (+13 more)

### Community 36 - "catalog.ts"
Cohesion: 0.18
Nodes (22): cached(), cacheKeys, client(), get(), globalForCache, invalidate(), keyFor(), put() (+14 more)

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
Cohesion: 0.13
Nodes (25): AgentFormFields(), Dialog(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogTitle(), DialogTrigger() (+17 more)

### Community 43 - "vault.ts"
Cohesion: 0.17
Nodes (15): CredentialType, ImportResult, credentialActiveSchema, credentialInputSchema, credentialUpdateSchema, createCredential(), CredentialMetaPatch, deleteCredential() (+7 more)

### Community 44 - "pagination.tsx"
Cohesion: 0.24
Nodes (12): PageSlot, pageWindow(), RunsPagination(), buttonVariants, Pagination(), PaginationContent(), PaginationEllipsis(), PaginationItem() (+4 more)

### Community 45 - "Egress proxy — YouTube from the production host"
Cohesion: 0.10
Nodes (19): 1. The measurement this exists for, 1a. The trap that cost an afternoon — and the wrong lesson drawn from it, 2. How it is wired, 3. THE MANUAL STEP, AND WHY THERE ISN'T ONE ANY MORE, 4. Operating it, 5. Failure modes and what they mean, 6. Security notes, 7. Open questions and honest caveats (+11 more)

### Community 46 - "admission.ts"
Cohesion: 0.35
Nodes (11): acquire(), acquireUserSlot(), Admission, admitRun(), budgetKey(), chargeBudget(), checkWindow(), credentialLockKey() (+3 more)

### Community 47 - "queue/worker.ts"
Cohesion: 0.24
Nodes (12): processRun(), createRedis(), getRedis(), getRunLogRedis(), globalForRedis, globalForRunLogs, enqueueRun(), getRunsQueue() (+4 more)

### Community 48 - "getDb"
Cohesion: 0.32
Nodes (10): PromptsData(), getDb(), listPrompts(), loadPrompt(), PROMPT_SEEDS, PromptKey, PromptSeed, resetPrompt() (+2 more)

### Community 49 - "Relay README (stack, setup, layout)"
Cohesion: 0.22
Nodes (9): Next.js Agent Rules (read node_modules docs first), The stale-worker trap, Google Search Console site-verification file, Project layout (src/app, lib/db, observability, crypto, schemas), Relay README (stack, setup, layout), Relay stack table (Bun, Next.js, Hono, Drizzle, Zod, Biome), Circuit breakers (3 files/step, typecheck gate, stop for approval), Code hygiene: 250-line cap and backend naming (+1 more)

### Community 50 - "Relay Brand Mark (logo.png)"
Cohesion: 0.33
Nodes (11): Public Static App Icon Asset, Square 1024x1024 App-Icon Canvas, Brand Palette: Emerald Green + Navy Accent on White, Arrow-Into-Stack Interlock Composition, Media Relay / Extraction Product Identity, Play / Forward-Arrow Triangle Motif, Relay Brand Mark (logo.png), Relay (Brand Name) (+3 more)

### Community 51 - "toast.tsx"
Cohesion: 0.17
Nodes (7): TOAST_TYPE_STYLES, ToastAction(), ToastClose(), ToastContent(), ToastDescription(), ToastTitle(), ToastViewport()

### Community 52 - "facts.ts"
Cohesion: 0.25
Nodes (9): fetchRunFacts(), json(), MODEL_PATHS, ModelPath, modelsFrom(), num(), sourcesFrom(), StageModel (+1 more)

### Community 53 - "[[...route]]/route.ts"
Cohesion: 0.12
Nodes (16): app, DELETE, GET, PATCH, POST, PUT, ingest(), deleteRun() (+8 more)

### Community 54 - "run-status-badge.tsx"
Cohesion: 0.53
Nodes (4): RunStatusBadge(), Badge(), badgeVariants, runStatusMeta

### Community 55 - "Gemini wired for extraction"
Cohesion: 0.18
Nodes (14): Agent sprawl: the router was the cause, disposition(): 5xx is next-model, not fail, The evidence contract is structural, not requested, Planned Task 4.3b: frame/vision extraction (amends PRD §5), Gemini wired for extraction, The gemma `excludes` wrong turn, isolate() and the unterminated trailing fence, Capability-driven model ranking heuristics (+6 more)

### Community 56 - "settings/page.tsx"
Cohesion: 0.18
Nodes (13): dynamic, metadata, SettingsPage(), dynamic, metadata, VaultData(), SecurityCard(), CredentialsTableSkeleton() (+5 more)

### Community 57 - "run-logs.ts"
Cohesion: 0.19
Nodes (13): LEVEL_NAMES, RunLogStream, appendRunLog(), dropRunLogs(), DROPPED, LEVEL_NAME, levelName(), readRunLogsHistory() (+5 more)

### Community 58 - "auth-session.ts"
Cohesion: 0.17
Nodes (13): { GET, POST }, Home(), LandingPage(), marquee, MARQUEE_LOOP, stories, auth, authSchema (+5 more)

### Community 59 - "dependencies"
Cohesion: 0.22
Nodes (9): @base-ui/react, @dnd-kit/utilities, hono, @openobserve/browser-rum, dependencies, @base-ui/react, @dnd-kit/utilities, hono (+1 more)

### Community 60 - "document.ts"
Cohesion: 0.12
Nodes (29): ClaimFinding, findingEvidence(), REASON_TEXT, FlagNotice(), Item(), RunExtraction(), countEvidence(), Evidence (+21 more)

### Community 61 - "runs/page.tsx"
Cohesion: 0.29
Nodes (7): dynamic, metadata, QueuePage(), RunsData(), RunsTable(), RunsTableSkeleton(), listRuns()

### Community 62 - "lib/agents.ts"
Cohesion: 0.37
Nodes (9): DuplicateAgentNameError, nameTaken(), createAgent(), deleteAgent(), listAgents(), setAgentActive(), toSummary(), updateAgent() (+1 more)

### Community 63 - "schema-pipeline.ts"
Cohesion: 0.20
Nodes (9): authUsers, ModelCatalog, NewModelCatalog, NewPrompt, NewUserSetting, Prompt, prompts, UserSetting (+1 more)

### Community 64 - "json-view.tsx"
Cohesion: 0.18
Nodes (11): JsonPanel(), onCopy(), useCollapseAll(), JSON_EDITOR_BASE, THEME, JsonInput(), JsonView(), RunRawData() (+3 more)

### Community 65 - "run-detail.tsx"
Cohesion: 0.14
Nodes (15): ExternalLink(), hostOf(), Linkify(), Token, tokenize(), PublishedPanel(), dateFormat, FACTS (+7 more)

### Community 66 - "§7 Phased build plan (Phases 0-6)"
Cohesion: 0.17
Nodes (16): Explicit Clone replaces copy-on-write for System agents, additional_data reduced to a derived `stale` boolean, Modal shell over DialogContent (src/components/modal.tsx), Phase 0: YouTube GVS 403 and player_client fallbacks, SESSION_EXPIRED classification (Phase 4), Turso/libSQL adoption and non-automatic migrations, bun run verify:ytdlp acceptance test, Bun-first mandate (Bun-native and Web-standard APIs) (+8 more)

### Community 67 - "notion-guides.ts"
Cohesion: 0.36
Nodes (8): ensureCategoryPage(), ensureEntriesDataSource(), ensureGuidesTarget(), findGuidesDataSource(), GuidesTarget, NotionGuidesError, plainTitle(), titlePropertyName()

### Community 68 - "lib/runs.ts"
Cohesion: 0.20
Nodes (15): RunData(), RunFact, StatusCount, AnalysisMode, RunStatus, sourceLabel(), createRun(), getRun() (+7 more)

### Community 69 - "skip-paths.ts"
Cohesion: 0.33
Nodes (7): SKIP_EXACT, SKIP_EXTENSIONS, skipRequestLog(), config, proxy(), redact(), sendTrace()

### Community 75 - "provider-mark.tsx"
Cohesion: 0.22
Nodes (12): ProviderMark(), ProviderPicker(), PROVIDER_MARKS, providerIcon, providerIconVariant(), ProviderIconWithVariant, ProviderMarkSpec, NEUTRAL_ACCENT (+4 more)

### Community 77 - "cookie-import-steps.tsx"
Cohesion: 0.21
Nodes (11): BrowserGuide, BROWSERS, ConnectPlatform, DEFAULT_GUIDE, FIREFOX_ANDROID_STORE, useBrowserGuide(), CopyableUrl(), Note() (+3 more)

### Community 78 - "lib/providers.ts"
Cohesion: 0.17
Nodes (11): ProviderCard(), ProviderCardProps, RayProviderGrid(), SocialProviderGrid(), AI_KEY_PROVIDERS, ALL_PROVIDERS, PROVIDER_IDS, RAY_PROVIDERS (+3 more)

### Community 79 - "requireSession"
Cohesion: 0.29
Nodes (9): AgentsPage(), DashboardCatchAll(), generateMetadata(), Params, sectionTitle(), titleCase(), DashboardLayout(), VaultPage() (+1 more)

### Community 81 - "query/settings.ts"
Cohesion: 0.11
Nodes (26): ChainEntryRow, accountFor(), ChainList(), contextLabel(), ModelPicker(), ShareCard(), StagePriorityCard(), StageTabContent() (+18 more)

### Community 83 - "screen-text.ts"
Cohesion: 0.33
Nodes (9): ContactSheet, VISION_SCHEMA, VISION_SYSTEM, visionUserPrompt(), oneLine(), readScreenText(), sheetAsDataUrl(), VisionFrame (+1 more)

### Community 84 - "models.ts"
Cohesion: 0.36
Nodes (9): asArray(), asNumber(), isFree(), normaliseCatalog(), normaliseModel(), parameterCount(), rankModels(), sizeScore() (+1 more)

### Community 90 - "query/runs.ts"
Cohesion: 0.16
Nodes (13): DeleteRun(), API_BASE, ApiError, apiFetch(), fetchRun(), fetchRuns(), hasActiveRuns(), runDetailQueryOptions() (+5 more)

### Community 93 - "verify-ytdlp.ts"
Cohesion: 0.47
Nodes (5): attempt(), CHAIN, FIXTURES, label(), main()

### Community 111 - "schemas.ts"
Cohesion: 0.15
Nodes (12): agentInputSchema, agentUpdateSchema, CookieImportInput, cookieImportSchema, ExtractionChainInput, PromptUpdateInput, promptUpdateSchema, rayCallbackSchema (+4 more)

### Community 112 - "db/index.ts"
Cohesion: 0.18
Nodes (9): db, indexes, raw, tables, { construct }, { createClient }, createDb(), globalForDb (+1 more)

### Community 113 - "config/index.ts"
Cohesion: 0.15
Nodes (14): metadata, AppConfig, config, PORT, YOUTUBE_CLIENTS, RayProviderId, configuredRayIds(), getProvider() (+6 more)

### Community 116 - "share-target.tsx"
Cohesion: 0.26
Nodes (9): ExistingRun, clearPendingShare(), readPendingShare(), StoredShare, writePendingShare(), ShareExisting(), ShareTarget(), NewRunDialog() (+1 more)

### Community 117 - "extraction/providers.ts"
Cohesion: 0.40
Nodes (3): EXTRACTION_ORDER, OLLAMA_CAPABILITIES, providers

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
Cohesion: 0.11
Nodes (20): Check, checks, FAILURE_SHAPES, leaks, logRecord, serialized, openObserveMiddleware(), traceBody() (+12 more)

### Community 137 - "vault-select.ts"
Cohesion: 0.22
Nodes (16): decrypt(), encrypt(), EncryptedPayload, getMasterKey(), credentials, getCredentialIdByType(), getSecretByType(), StoredSecret (+8 more)

### Community 141 - "model-picker.tsx"
Cohesion: 0.13
Nodes (17): NavUser(), ProfileCard(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuGroup(), DropdownMenuItem(), DropdownMenuLabel() (+9 more)

### Community 142 - "run-models.tsx"
Cohesion: 0.29
Nodes (6): MODE_LABEL, Phase, phasesFrom(), ProviderChip(), RunModels(), STAGE_BAR

### Community 143 - "agents/page.tsx"
Cohesion: 0.24
Nodes (9): AgentsData(), dynamic, metadata, AgentsTable(), AgentsTableSkeleton(), QueryProvider(), getQueryClient(), makeQueryClient() (+1 more)

### Community 144 - "YouTube"
Cohesion: 0.33
Nodes (6): 1. Open a private window, 2. Sign in to YouTube, 3. Navigate to robots.txt — in the same tab, 4. Export, then close the window immediately, 5. Upload, YouTube

## Ambiguous Edges - Review These
- `Project layout (src/app, lib/db, observability, crypto, schemas)` → `Google Search Console site-verification file`  [AMBIGUOUS]
  public/google81b6e6165b427f27.html · relation: conceptually_related_to

## Knowledge Gaps
- **448 isolated node(s):** `$schema`, `enabled`, `clientKind`, `useIgnoreFile`, `src/**` (+443 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 578 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Project layout (src/app, lib/db, observability, crypto, schemas)` and `Google Search Console site-verification file`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `cn()` connect `cn` to `sidebar.tsx`, `profile-card.tsx`, `run-stage-timeline.tsx`, `button.tsx`, `model-picker.tsx`, `run-models.tsx`, `ingest.ts`, `app/layout.tsx`, `run-facts.tsx`, `share/page.tsx`, `schema.ts`, `utils.ts`, `credentials-row.tsx`, `prompts/page.tsx`, `new-run-dialog.tsx`, `pagination.tsx`, `toast.tsx`, `run-status-badge.tsx`, `document.ts`, `json-view.tsx`, `run-detail.tsx`, `provider-mark.tsx`, `lib/providers.ts`, `query/settings.ts`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Why does `config` connect `config/index.ts` to `sidebar.tsx`, `scripts/worker.ts`, `logger.ts`, `vault-select.ts`, `chat.ts`, `overview.ts`, `ingest.ts`, `app/layout.tsx`, `notion.ts`, `share/page.tsx`, `chat-attempt.ts`, `catalog.ts`, `vault.ts`, `admission.ts`, `queue/worker.ts`, `getDb`, `[[...route]]/route.ts`, `run-logs.ts`, `auth-session.ts`, `query/runs.ts`, `verify-ytdlp.ts`, `db/index.ts`, `login/page.tsx`, `extraction/providers.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `getDb()` connect `getDb` to `vault-select.ts`, `chat.ts`, `lib/settings.ts`, `ingest.ts`, `extraction/index.ts`, `share/page.tsx`, `chat-attempt.ts`, `logger`, `catalog.ts`, `vault.ts`, `queue/worker.ts`, `facts.ts`, `[[...route]]/route.ts`, `settings/page.tsx`, `auth-session.ts`, `runs/page.tsx`, `lib/agents.ts`, `lib/runs.ts`, `query/settings.ts`, `db/index.ts`, `share-target.tsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `$schema`, `enabled`, `clientKind` to the rest of the system?**
  _448 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `query/agents.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12535612535612536 - nodes in this community are weakly interconnected._
- **Should `sidebar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0593990216631726 - nodes in this community are weakly interconnected._
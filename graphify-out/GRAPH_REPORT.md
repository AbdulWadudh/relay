# Graph Report - relay  (2026-09-04)

## Corpus Check
- 308 files · ~249,650 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1945 nodes · 4727 edges · 136 communities (87 shown, 42 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a1349ca7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- runs-table.tsx
- sidebar.tsx
- Troubleshooting
- OpenObserveStream
- profile-card.tsx
- query/runs.ts
- scripts
- Relay production runbook
- resolve.ts
- biome.json
- delete-agent.tsx
- chat.ts
- nav-user.tsx
- compilerOptions
- transcription/index.ts
- lib/settings.ts
- settings/page.tsx
- system-agents.ts
- ingest.ts
- app/layout.tsx
- lib/providers.ts
- logger
- agents/page.tsx
- extraction/index.ts
- Relay (PRD): short-form video to evidence-grounded Markdown
- components.json
- share-target.tsx
- schema.ts
- stage-priority-card.tsx
- chat-attempt.ts
- button.tsx
- verify.ts
- SESSION_AUTH: server-side cookie capture for social sources
- pipeline.ts
- prompts/page.tsx
- Relay UI/UX philosophy (data-dense command center)
- extraction/prompts.ts
- compose: capture service (Chromium, shm, seccomp)
- Relay for Android — Trusted Web Activity wrapper
- §2.1 Capture runs in its own Bun process
- `auth_users`
- §3 Storage model (column mapping for a cookie credential)
- new-run-dialog.tsx
- vault.ts
- pagination.tsx
- Egress proxy — YouTube from the production host
- admission.ts
- config/index.ts
- cn
- Relay README (stack, setup, layout)
- Relay Brand Mark (logo.png)
- toast.tsx
- field.tsx
- schemas.ts
- utils.ts
- Gemini wired for extraction
- vault/page.tsx
- server/runs.ts
- auth-session.ts
- dependencies
- notion.ts
- runs/page.tsx
- getDb
- credentials-row.tsx
- agent-form-fields.tsx
- run-detail.tsx
- §1.1 YouTube GVS 403 (settled by measurement)
- link-icon.tsx
- lib/runs.ts
- skip-paths.ts
- free-port.ts
- privacy/page.tsx
- terms/page.tsx
- best-effort-json-parser
- better-auth
- schema-pipeline.ts
- bullmq
- import-session-dialog.tsx
- §4.2 withSourceCookies (materialize and destroy)
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
- extraction/providers.ts
- next.config.ts
- next-themes
- [id]/page.tsx
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
- login/page.tsx
- linkify.tsx
- class-variance-authority
- verify-ytdlp.ts
- extraction/route.ts
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

## God Nodes (most connected - your core abstractions)
1. `cn()` - 236 edges
2. `getDb()` - 62 edges
3. `Button()` - 41 edges
4. `config` - 41 edges
5. `logger` - 35 edges
6. `providerLabel()` - 26 edges
7. `toast` - 21 edges
8. `Spinner()` - 18 edges
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

## Communities (136 total, 42 thin omitted)

### Community 0 - "runs-table.tsx"
Cohesion: 0.05
Nodes (61): DisabledActionSlot(), AgentFormDialog(), onOpenChange(), initialModeFor(), AgentFormFields(), AgentStatusToggle(), AGENT_COLUMNS, dateFormat (+53 more)

### Community 1 - "sidebar.tsx"
Cohesion: 0.08
Nodes (34): AppSidebar(), NAV, ProfileUser, ThemeToggle(), Sidebar(), SidebarContent(), SidebarContext, SidebarContextProps (+26 more)

### Community 2 - "Troubleshooting"
Cohesion: 0.07
Nodes (27): 1. Open a private window, 1. Sign in, 2. Go to the export page, 2. Sign in to YouTube, 3. Export, 3. Navigate to robots.txt — in the same tab, 4. Export, then close the window immediately, 4. Upload (+19 more)

### Community 4 - "profile-card.tsx"
Cohesion: 0.14
Nodes (18): PanelTone, TONE_TILE, NavUser(), ProfileCard(), ChangePasswordForm(), Card(), CardContent(), CardDescription() (+10 more)

### Community 5 - "query/runs.ts"
Cohesion: 0.12
Nodes (25): formatFields(), LEVEL_TONE, RunLogLines(), timeFormat, Level, LEVELS, RANK, RunLogStream() (+17 more)

### Community 6 - "scripts"
Cohesion: 0.05
Nodes (37): @biomejs/biome, drizzle-kit, devDependencies, @biomejs/biome, drizzle-kit, tailwindcss, @tailwindcss/postcss, @types/bun (+29 more)

### Community 7 - "Relay production runbook"
Cohesion: 0.07
Nodes (26): 1. What is running, 2. The pipeline, 3. YouTube egress — the part most likely to break, 4.1 Read the run's own logs first, 4.2 Match the message, 4.3 Error classification, 4.4 The OpenObserve read path returns 401, 4.5 What is deliberately NOT shipped to OpenObserve (+18 more)

### Community 8 - "resolve.ts"
Cohesion: 0.18
Nodes (17): AiKeyProviderId, providers, TRANSCRIPTION_ORDER, transcriptionProvider, transcriptionProviderIds(), Candidate, candidates(), WhisperPair (+9 more)

### Community 9 - "biome.json"
Cohesion: 0.06
Nodes (32): css, parser, next, react, files, includes, formatter, enabled (+24 more)

### Community 10 - "delete-agent.tsx"
Cohesion: 0.24
Nodes (15): DeleteRun(), AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader() (+7 more)

### Community 11 - "chat.ts"
Cohesion: 0.23
Nodes (15): candidates(), resolveChain(), attemptPass(), exhausted(), ChatExhaustedError, describeSkipped(), NoExtractionKeyError, runChat() (+7 more)

### Community 12 - "nav-user.tsx"
Cohesion: 0.12
Nodes (18): Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), DropdownMenu(), DropdownMenuCheckboxItem() (+10 more)

### Community 13 - "compilerOptions"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, next.config.ts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts (+22 more)

### Community 14 - "transcription/index.ts"
Cohesion: 0.24
Nodes (12): transcribe(), Transcription, NoTranscriptionKeyError, runWhisperPair(), shouldTryNextAccount(), isMostlyLatin(), latinRatio(), RomanStream (+4 more)

### Community 15 - "lib/settings.ts"
Cohesion: 0.21
Nodes (18): CHAT_STAGE_IDS, extractionChainSchema, shareAutoRunSchema, stageModelSchema, allCredentialChains(), cleanIds(), forgetCredentialChain(), getCredentialChain() (+10 more)

### Community 16 - "settings/page.tsx"
Cohesion: 0.22
Nodes (8): metadata, dynamic, metadata, ShellContent(), ShellHeader(), DashboardNotFoundPanel(), SecurityCard(), authAccounts

### Community 17 - "system-agents.ts"
Cohesion: 0.20
Nodes (8): SchemaFragment, PLACE_PROMPT, PLACE_SCHEMA, RECIPE_PROMPT, RECIPE_SCHEMA, SynthesizedAgent, SYSTEM_AGENTS, SystemAgentDefinition

### Community 18 - "ingest.ts"
Cohesion: 0.06
Nodes (61): BINARIES, BinarySpec, BinaryVersions, detectBinary(), detected, ensureMediaBinaries(), firstLine(), MediaBinaryError (+53 more)

### Community 19 - "app/layout.tsx"
Cohesion: 0.09
Nodes (24): fontMono, metadata, oxaniumHeading, RootLayout(), spaceGrotesk, viewport, ServiceWorker(), ErrorBoundaryState (+16 more)

### Community 20 - "lib/providers.ts"
Cohesion: 0.06
Nodes (47): ProviderMark(), MODE_LABEL, Phase, phasesFrom(), ProviderChip(), RunModels(), STAGE_BAR, ChainEntryRow (+39 more)

### Community 21 - "logger"
Cohesion: 0.24
Nodes (14): ModelCatalog, CachedCatalog, catalogFor(), fetchModels(), readCache(), resolve(), warm(), writeCache() (+6 more)

### Community 22 - "agents/page.tsx"
Cohesion: 0.19
Nodes (12): AgentsData(), AgentsPage(), dynamic, metadata, SettingsPage(), VaultData(), AgentsTable(), AgentsTableSkeleton() (+4 more)

### Community 23 - "extraction/index.ts"
Cohesion: 0.10
Nodes (27): COMPACT_EVIDENCE, compactSchemaForPrompt(), Evidence, EVIDENCE_SCHEMA, EvidenceKind, isEvidence(), isTranscriptEvidence(), isVisualEvidence() (+19 more)

### Community 24 - "Relay (PRD): short-form video to evidence-grounded Markdown"
Cohesion: 0.11
Nodes (23): 0.2.0 - Credentials Dashboard & Notion Ray, Task 4.4-4.6: Extraction, Grounding & Notion Publishing, Document tree and Notion publish (Task 4.6), The evidence contract is structural, not requested, Evidence verification (Task 4.5), Planned Task 4.3b: frame/vision extraction (amends PRD §5), Groq free-tier TPM pressure and mitigations, Media ingest gotchas (ffmpeg exit 8, Bun $ newline, rm no-op) (+15 more)

### Community 25 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 26 - "share-target.tsx"
Cohesion: 0.16
Nodes (19): metadata, SharePage(), clearPendingShare(), readPendingShare(), StoredShare, writePendingShare(), candidates(), resolveShare() (+11 more)

### Community 27 - "schema.ts"
Cohesion: 0.12
Nodes (19): ExistingRun, ShareExisting(), SharePanel(), Agent, authSessions, authVerifications, Credential, NewAgent (+11 more)

### Community 28 - "stage-priority-card.tsx"
Cohesion: 0.10
Nodes (25): StagePriorityCard(), TAB_ACCENT, Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), AddCredentialDialog() (+17 more)

### Community 29 - "chat-attempt.ts"
Cohesion: 0.18
Nodes (17): attemptKey(), AttemptOptions, ChatRun, KeyAttempt, disposition, MAX_CANDIDATES, retryAfterMs(), SkippedModel (+9 more)

### Community 30 - "button.tsx"
Cohesion: 0.29
Nodes (9): canRetry(), RetryRun(), TERMINAL, RunDetailHeader(), RunsTable(), Button(), Tooltip(), TooltipContent() (+1 more)

### Community 31 - "verify.ts"
Cohesion: 0.17
Nodes (14): normalise(), NormalisedTranscript, normaliseTranscript(), check(), contentWords(), Finding, isRecord(), pointerSegment() (+6 more)

### Community 32 - "SESSION_AUTH: server-side cookie capture for social sources"
Cohesion: 0.14
Nodes (19): Queue admission control (src/lib/queue/admission.ts), Capture security model (loopback CDP, ticket, fenced navigation), Deferral via moveToDelayed + DelayedError, Deferred: social cookie credentials (2026-08-31 decision), Per-user slot semaphore (fairness), Per-credential rate budget as a rolling window, Zod validates all external input at the API boundary, Branch A: yt-dlp-only consolidation (+11 more)

### Community 33 - "pipeline.ts"
Cohesion: 0.17
Nodes (22): analyseMedia(), analysisRecord(), NoFrameTextError, readFrames(), VerificationSummary, verifyExtraction(), RunContext, setRunStage() (+14 more)

### Community 34 - "prompts/page.tsx"
Cohesion: 0.16
Nodes (15): dynamic, metadata, PromptsData(), PromptCard(), PromptsList(), CARDS, PromptsSkeleton(), listPrompts() (+7 more)

### Community 35 - "Relay UI/UX philosophy (data-dense command center)"
Cohesion: 0.13
Nodes (18): 0.1.0 - Foundation & Database, Component strictness: zero native form elements, GSAP animation standards (useGSAP, guarded refs), ShadCN preset b5pFrsf5Vq (mira/zinc/emerald), Typography & iconography (Oxanium, Space Grotesk, JetBrains Mono, HugeIcons), Relay UI/UX philosophy (data-dense command center), Authenticated browser verification via signed auth_sessions cookie, Explicit Clone replaces copy-on-write for System agents (+10 more)

### Community 36 - "extraction/prompts.ts"
Cohesion: 0.21
Nodes (16): cached(), cacheKeys, client(), get(), globalForCache, invalidate(), keyFor(), put() (+8 more)

### Community 37 - "compose: capture service (Chromium, shm, seccomp)"
Cohesion: 0.16
Nodes (17): 0.3.0 - Coolify deployment & Drizzle Gateway, Authentication & Observability (Better Auth, Pino, Rays rebrand), Deployment: deps/builder/runtime Dockerfile stages, Relay Changelog, OpenObserve observability (client RUM + server logs), CAPTURE_INTERNAL_TOKEN (dedicated inter-service secret), compose: capture service (Chromium, shm, seccomp), compose: dragonfly service (pinned, allow-undeclared-keys) (+9 more)

### Community 38 - "Relay for Android — Trusted Web Activity wrapper"
Cohesion: 0.18
Nodes (10): 1. Prerequisites, 2. The release signing key, 3. Build, 4. Verify before shipping, 5. Two ordering rules that bite, 6. Rotating the signing key, 7. Releasing a new version, Bubblewrap manifest gotchas (+2 more)

### Community 39 - "§2.1 Capture runs in its own Bun process"
Cohesion: 0.14
Nodes (16): Source-scoped binary preflight (ensureMediaBinaries), Capture browser launch prerequisites (xauth, chromium-sandbox, seccomp), CAPTURE_PUBLIC_URL public wss route (open decision), Capture service as a third process (Phase 2), Three capture bugs found by testing, Instagram unblocked via instaloader, Three-tier link icon resolution, Media source registry (src/lib/media/sources.ts) (+8 more)

### Community 40 - "`auth_users`"
Cohesion: 0.17
Nodes (10): `agents`, `auth_accounts`, `auth_sessions`, `auth_users`, `auth_verifications`, `credentials`, `relay_runs`, `model_catalog` (+2 more)

### Community 41 - "§3 Storage model (column mapping for a cookie credential)"
Cohesion: 0.17
Nodes (15): additional_data reduced to a derived `stale` boolean, BYOK encrypted credential vault, Security rule: encrypted tokens, plaintext meta_data, never logged, §3.2 expires_at is a floor on uselessness, §4.4 Capture logging allowlist, §3.3 What must never enter meta_data, §3.5 Migration: NONE (Drizzle enum is TypeScript-level), §3.4 Reconnect works with no new code (+7 more)

### Community 42 - "new-run-dialog.tsx"
Cohesion: 0.14
Nodes (23): ACCENT, ModalAccent, ModalProps, ModalSize, SIZE, Dialog(), DialogClose(), DialogContent() (+15 more)

### Community 43 - "vault.ts"
Cohesion: 0.15
Nodes (22): decrypt(), encrypt(), EncryptedPayload, getMasterKey(), credentials, createCredential(), CredentialMetaPatch, deleteCredential() (+14 more)

### Community 44 - "pagination.tsx"
Cohesion: 0.24
Nodes (12): PageSlot, pageWindow(), RunsPagination(), buttonVariants, Pagination(), PaginationContent(), PaginationEllipsis(), PaginationItem() (+4 more)

### Community 45 - "Egress proxy — YouTube from the production host"
Cohesion: 0.10
Nodes (19): 1. The measurement this exists for, 1a. The trap that cost an afternoon — and the wrong lesson drawn from it, 2. How it is wired, 3. THE MANUAL STEP, AND WHY THERE ISN'T ONE ANY MORE, 4. Operating it, 5. Failure modes and what they mean, 6. Security notes, 7. Open questions and honest caveats (+11 more)

### Community 46 - "admission.ts"
Cohesion: 0.32
Nodes (12): acquire(), acquireUserSlot(), Admission, admitRun(), budgetKey(), chargeBudget(), checkWindow(), credentialLockKey() (+4 more)

### Community 47 - "config/index.ts"
Cohesion: 0.10
Nodes (23): worker, metadata, LandingPage(), marquee, MARQUEE_LOOP, stories, AppConfig, config (+15 more)

### Community 48 - "cn"
Cohesion: 0.10
Nodes (27): Breadcrumb(), BreadcrumbEllipsis(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage(), BreadcrumbSeparator(), CardAction() (+19 more)

### Community 49 - "Relay README (stack, setup, layout)"
Cohesion: 0.20
Nodes (12): Next.js Agent Rules (read node_modules docs first), LLM Execution State (Relay task ledger), Stage completion derived from recorded timings, The stale-worker trap, Google Search Console site-verification file, Project layout (src/app, lib/db, observability, crypto, schemas), Relay README (stack, setup, layout), Relay stack table (Bun, Next.js, Hono, Drizzle, Zod, Biome) (+4 more)

### Community 50 - "Relay Brand Mark (logo.png)"
Cohesion: 0.33
Nodes (11): Public Static App Icon Asset, Square 1024x1024 App-Icon Canvas, Brand Palette: Emerald Green + Navy Accent on White, Arrow-Into-Stack Interlock Composition, Media Relay / Extraction Product Identity, Play / Forward-Arrow Triangle Motif, Relay Brand Mark (logo.png), Relay (Brand Name) (+3 more)

### Community 51 - "toast.tsx"
Cohesion: 0.17
Nodes (7): TOAST_TYPE_STYLES, ToastAction(), ToastClose(), ToastContent(), ToastDescription(), ToastTitle(), ToastViewport()

### Community 52 - "field.tsx"
Cohesion: 0.22
Nodes (9): Field(), FieldContent(), FieldError(), FieldLegend(), FieldSeparator(), FieldSet(), FieldTitle(), fieldVariants (+1 more)

### Community 53 - "schemas.ts"
Cohesion: 0.08
Nodes (32): app, DELETE, GET, PATCH, POST, PUT, PromptKey, updatePrompt() (+24 more)

### Community 54 - "utils.ts"
Cohesion: 0.18
Nodes (10): ACCENT, FALLBACK, RunStatusBadge(), Badge(), badgeVariants, Textarea(), ConnectRail(), RailStep (+2 more)

### Community 55 - "Gemini wired for extraction"
Cohesion: 0.24
Nodes (10): Agent sprawl: the router was the cause, disposition(): 5xx is next-model, not fail, Gemini wired for extraction, The gemma `excludes` wrong turn, isolate() and the unterminated trailing fence, Capability-driven model ranking heuristics, Ollama local + cloud provider, Every prompt lives in the database with Redis hot cache (+2 more)

### Community 56 - "vault/page.tsx"
Cohesion: 0.21
Nodes (11): dynamic, metadata, VaultPage(), CredentialsTableSkeleton(), VaultActions(), VaultNotices(), agentKeys, credentialKeys (+3 more)

### Community 57 - "server/runs.ts"
Cohesion: 0.16
Nodes (16): LEVEL_NAMES, RunLogStream, appendRunLog(), dropRunLogs(), DROPPED, LEVEL_NAME, levelName(), readRunLogsHistory() (+8 more)

### Community 58 - "auth-session.ts"
Cohesion: 0.29
Nodes (8): { GET, POST }, Home(), auth, authSchema, AuthSession, getRequestSession, getSessionFromHeaders(), guard()

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
Cohesion: 0.21
Nodes (18): CredentialActiveToggle(), describe(), accountEmailFor(), accountNameFor(), dateFormat, displayName(), metaString(), ProviderTile() (+10 more)

### Community 64 - "agent-form-fields.tsx"
Cohesion: 0.16
Nodes (12): JsonPanel(), onCopy(), useCollapseAll(), JSON_EDITOR_BASE, THEME, JsonInput(), JsonView(), RunRawData() (+4 more)

### Community 65 - "run-detail.tsx"
Cohesion: 0.14
Nodes (18): dateFormat, RunDetail(), FACTS, RunDetailSkeleton(), STAGES, Fact, FactList(), numberFormat (+10 more)

### Community 66 - "§1.1 YouTube GVS 403 (settled by measurement)"
Cohesion: 0.60
Nodes (5): Phase 0: YouTube GVS 403 and player_client fallbacks, bun run verify:ytdlp acceptance test, §1.1b PO tokens rejected, §1.1 YouTube GVS 403 (settled by measurement), Risk #8: the yt-dlp pin is stale with no bump cadence

### Community 67 - "link-icon.tsx"
Cohesion: 0.29
Nodes (8): Brand, BRANDS, faviconFor(), LinkIcon(), secondLevel(), SOURCE_ICON, SourceIcon(), sourceIdForHost()

### Community 68 - "lib/runs.ts"
Cohesion: 0.22
Nodes (11): ModePicker(), MODES, AnalysisMode, sourceLabel(), createRun(), RunDetail, RunPage, RUNS_PER_PAGE (+3 more)

### Community 69 - "skip-paths.ts"
Cohesion: 0.33
Nodes (7): SKIP_EXACT, SKIP_EXTENSIONS, skipRequestLog(), config, proxy(), redact(), sendTrace()

### Community 75 - "schema-pipeline.ts"
Cohesion: 0.22
Nodes (8): authUsers, NewModelCatalog, NewPrompt, NewUserSetting, Prompt, prompts, UserSetting, userSettings

### Community 77 - "import-session-dialog.tsx"
Cohesion: 0.12
Nodes (17): BrowserGuide, BROWSERS, ConnectPlatform, DEFAULT_GUIDE, FIREFOX_ANDROID_STORE, useBrowserGuide(), CopyableUrl(), Note() (+9 more)

### Community 78 - "§4.2 withSourceCookies (materialize and destroy)"
Cohesion: 0.33
Nodes (6): Per-credential jar lock (correctness), Jar write-back on a FAILED download (bug), §3.6 getSecretByType (vault widening), §4.2 Jar rotation write-back (--cookies is read-write), §4.2 withSourceCookies (materialize and destroy), §4.2b YouTube's stricter cookie rules

### Community 79 - "requireSession"
Cohesion: 0.29
Nodes (9): DashboardCatchAll(), generateMetadata(), Params, sectionTitle(), titleCase(), DashboardLayout(), PromptsPage(), RunPage() (+1 more)

### Community 81 - "query/settings.ts"
Cohesion: 0.14
Nodes (22): accountFor(), ChainList(), contextLabel(), ModelPicker(), ShareCard(), StageTabContent(), ChainEntry, AccountModels (+14 more)

### Community 83 - "screen-text.ts"
Cohesion: 0.24
Nodes (13): Analysis, ContactSheet, EnglishStream, TranscriptSegment, VISION_SCHEMA, VISION_SYSTEM, visionUserPrompt(), oneLine() (+5 more)

### Community 84 - "models.ts"
Cohesion: 0.36
Nodes (9): asArray(), asNumber(), isFree(), normaliseCatalog(), normaliseModel(), parameterCount(), rankModels(), sizeScore() (+1 more)

### Community 90 - "extraction/providers.ts"
Cohesion: 0.40
Nodes (3): EXTRACTION_ORDER, OLLAMA_CAPABILITIES, providers

### Community 93 - "[id]/page.tsx"
Cohesion: 0.40
Nodes (5): dynamic, metadata, Params, RunData(), getRun()

### Community 111 - "rays.ts"
Cohesion: 0.26
Nodes (10): RayProviderId, rayCallbackSchema, getProvider(), isConfigured(), providers, RayProvider, redirectUri(), stateCookieName() (+2 more)

### Community 112 - "db/index.ts"
Cohesion: 0.18
Nodes (9): db, indexes, raw, tables, { construct }, { createClient }, createDb(), globalForDb (+1 more)

### Community 114 - "linkify.tsx"
Cohesion: 0.20
Nodes (11): ExternalLink(), hostOf(), Linkify(), Token, tokenize(), PublishedPanel(), RunTranscript(), Segment (+3 more)

### Community 116 - "verify-ytdlp.ts"
Cohesion: 0.47
Nodes (5): attempt(), CHAIN, FIXTURES, label(), main()

### Community 117 - "extraction/route.ts"
Cohesion: 0.19
Nodes (17): classify(), forRouting(), requestedAgent(), routableAgents(), routeAgent(), RoutingMode, toRouting(), compile() (+9 more)

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

## Ambiguous Edges - Review These
- `Project layout (src/app, lib/db, observability, crypto, schemas)` → `Google Search Console site-verification file`  [AMBIGUOUS]
  public/google81b6e6165b427f27.html · relation: conceptually_related_to

## Knowledge Gaps
- **440 isolated node(s):** `$schema`, `enabled`, `clientKind`, `useIgnoreFile`, `src/**` (+435 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 568 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Project layout (src/app, lib/db, observability, crypto, schemas)` and `Google Search Console site-verification file`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `cn()` connect `cn` to `runs-table.tsx`, `sidebar.tsx`, `profile-card.tsx`, `query/runs.ts`, `delete-agent.tsx`, `nav-user.tsx`, `app/layout.tsx`, `lib/providers.ts`, `schema.ts`, `stage-priority-card.tsx`, `button.tsx`, `prompts/page.tsx`, `new-run-dialog.tsx`, `pagination.tsx`, `toast.tsx`, `field.tsx`, `utils.ts`, `notion.ts`, `credentials-row.tsx`, `agent-form-fields.tsx`, `run-detail.tsx`, `link-icon.tsx`, `lib/runs.ts`, `query/settings.ts`, `linkify.tsx`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `config` connect `config/index.ts` to `runs-table.tsx`, `sidebar.tsx`, `logger.ts`, `chat.ts`, `ingest.ts`, `app/layout.tsx`, `logger`, `share-target.tsx`, `chat-attempt.ts`, `extraction/prompts.ts`, `vault.ts`, `admission.ts`, `schemas.ts`, `server/runs.ts`, `auth-session.ts`, `notion.ts`, `link-icon.tsx`, `extraction/providers.ts`, `rays.ts`, `db/index.ts`, `login/page.tsx`, `verify-ytdlp.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `getDb()` connect `getDb` to `chat.ts`, `lib/settings.ts`, `settings/page.tsx`, `system-agents.ts`, `ingest.ts`, `logger`, `agents/page.tsx`, `share-target.tsx`, `schema.ts`, `pipeline.ts`, `prompts/page.tsx`, `extraction/prompts.ts`, `vault.ts`, `admission.ts`, `config/index.ts`, `schemas.ts`, `server/runs.ts`, `auth-session.ts`, `runs/page.tsx`, `lib/runs.ts`, `query/settings.ts`, `[id]/page.tsx`, `db/index.ts`, `extraction/route.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `$schema`, `enabled`, `clientKind` to the rest of the system?**
  _440 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `runs-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.052507836990595615 - nodes in this community are weakly interconnected._
- **Should `sidebar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08048780487804878 - nodes in this community are weakly interconnected._
# Graph Report - relay  (2026-09-02)

## Corpus Check
- 243 files · ~134,490 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1603 nodes · 3787 edges · 110 communities (70 shown, 38 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.83)
- Token cost: 316,525 input · 0 output

## Community Hubs (Navigation)
- Agents Table & Query States
- App Sidebar & Navigation Chrome
- Capture Service & CDP Client
- Brand Icons & Binary Detection
- Forms, Cards & Settings Panels
- Run Models & Provider Badges
- Package Manifest & Dev Dependencies
- API Route Handlers & Schemas
- Transcription Providers
- Biome Lint & Format Config
- Row Actions & Alert Dialogs
- Agent Form State
- User Menu & Avatar Components
- TypeScript Compiler Config
- Credential Crypto & Cookie Vault
- Modal & Dialog Shell
- Extraction Chat Passes
- Extraction Orchestration & Routing
- Document Tree & Notion Publish
- Root Layout & Telemetry Providers
- Evidence Schema Contract
- Login Page & Build Scripts
- Worker Process & Pipeline
- Resizable Panels & Tabs
- Changelog: Extraction & Notion
- ShadCN Component Registry Config
- Extraction Findings UI
- Drizzle Database Schema
- Logging & OpenObserve Observability
- Transcript Normalise & Verify
- Agent CRUD & Name Guard
- Model Catalog Cache
- Queue Admission & Capture Security
- Prompts Page & Data
- Run Detail & Facts
- UI Philosophy & Component Rules
- Redis Cache & Prompt Loading
- Deployment & Auth Changelog
- Toasts & Prompt Card
- Binary Preflight & Capture Prereqs
- SQL Migrations
- Credential Storage & Security Rules
- Runs Queries & New Run Dialog
- Run Status & Stage Timeline
- Redis Connection, Queue & Tickets
- Dashboard Pages & Session Guard
- Linkify & Transcript Panels
- Better Auth & Session Resolution
- Queue Admission Control
- Project Rules & Build Plan
- Relay Brand Identity
- App Shell & Not Found
- Settings Page & Query Client
- Vault Page & Credential Keys
- Ray OAuth Providers
- Model Ranking & Provider Ordering
- JSON Panel & Viewer
- Dynamic Schema Synthesizer
- Notion Guides Target
- Runtime Dependencies
- Run Detail Page
- Provider Order Settings
- Runs Queue Page
- Cookie Jar Rotation & Locking
- Dashboard Catch-All Route
- Run Raw Data Collapsible
- YouTube 403 & yt-dlp Pin
- Database Smoke Test
- Run Detail Skeleton
- Capture Proxy & Tracing
- Free Port Helper
- Privacy Page
- Terms Page
- best-effort-json-parser Package
- Better Auth Package
- Drizzle Adapter Package
- BullMQ Package
- cfworker JSON Schema Package
- class-variance-authority Package
- clsx Package
- dnd-kit Core Package
- dnd-kit Sortable Package
- Drizzle ORM Package
- GSAP Package
- GSAP React Package
- HugeIcons Core Package
- HugeIcons React Package
- ioredis Package
- json-edit-react Package
- libsql Client Package
- Next.js Package
- Next.js Build Config
- next-themes Package
- Notion Client Package
- OpenObserve Browser Logs Package
- Pino Package
- React Package
- React DOM Package
- react-resizable-panels Package
- shadcn Package
- tailwind-merge Package
- TanStack React Query Package
- thesvg React Package
- tw-animate-css Package
- Zod Package
- PostCSS Config
- Biome Toolchain Decision
- Desktop Sizing Scale

## God Nodes (most connected - your core abstractions)
1. `cn()` - 206 edges
2. `getDb()` - 55 edges
3. `config` - 41 edges
4. `Button()` - 30 edges
5. `logger` - 29 edges
6. `providerLabel()` - 20 edges
7. `requireSession()` - 18 edges
8. `toast` - 17 edges
9. `compilerOptions` - 17 edges
10. `Spinner()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Component strictness: zero native form elements` --semantically_similar_to--> `UI rule: ShadCN components and HugeIcons only`  [INFERRED] [semantically similar]
  DESIGN.md → RULES.md
- `Evidence verification (Task 4.5)` --semantically_similar_to--> `Task 4.4-4.6: Extraction, Grounding & Notion Publishing`  [INFERRED] [semantically similar]
  LLM_STATE.md → CHANGELOG.md
- `Docker / Coolify deployment notes` --semantically_similar_to--> `Deployment: deps/builder/runtime Dockerfile stages`  [INFERRED] [semantically similar]
  LLM_STATE.md → CHANGELOG.md
- `ShadCN preset b5pFrsf5Vq (mira/zinc/emerald)` --semantically_similar_to--> `0.1.0 - Foundation & Database`  [INFERRED] [semantically similar]
  DESIGN.md → CHANGELOG.md
- `BYOK encrypted credential vault` --semantically_similar_to--> `TRD security & cryptographic standard (AES-256-GCM)`  [INFERRED] [semantically similar]
  PRD.md → TRD.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Session capture flow (mint ticket, stream, harvest, consume)** — session_auth_capture_own_process, session_auth_screencast_ws_security, session_auth_capture_provider_registry, session_auth_storage_model, session_auth_with_source_cookies [EXTRACTED 1.00]
- **Queue admission control (three locks + deferral)** — llm_state_per_user_slot, llm_state_per_credential_jar_lock, llm_state_rate_budget_rolling_window, llm_state_deferral_moveto_delayed [EXTRACTED 1.00]
- **Evidence grounding chain (transcript to published citation)** — prd_evidence_grounding, llm_state_transcription_gotchas, llm_state_evidence_contract_structural, llm_state_evidence_verification_4_5, llm_state_document_tree_notion_publish [INFERRED 0.85]
- **Logo mark construction: arrow, stack, interlock and palette form one identity** — public_logo_relay_brand_mark, public_logo_play_triangle_motif, public_logo_stacked_bars_motif, public_logo_interlock_composition, public_logo_brand_palette [EXTRACTED 1.00]
- **Relay Visual Identity System** — public_logo_relay_mark, public_logo_brand_palette, public_logo_relay_route_motif, public_logo_stacked_bars_motif, public_logo_app_icon_canvas [INFERRED 0.85]

## Communities (110 total, 38 thin omitted)

### Community 0 - "Agents Table & Query States"
Cohesion: 0.07
Nodes (56): DisabledActionSlot(), dateFormat, ROWS, TypeBadge(), QueryErrorState(), QueryStatusBar(), QueryStatusBarProps, QueryStatusBarSkeleton() (+48 more)

### Community 1 - "App Sidebar & Navigation Chrome"
Cohesion: 0.06
Nodes (59): AppSidebar(), NAV, ProfileUser, ThemeToggle(), AlertDialogMedia(), AlertDialogOverlay(), Breadcrumb(), BreadcrumbEllipsis() (+51 more)

### Community 2 - "Capture Service & CDP Client"
Cohesion: 0.06
Nodes (41): server, shutdown(), sweeper, CdpClient, CdpError, CdpEvent, PendingCall, browserArgs() (+33 more)

### Community 3 - "Brand Icons & Binary Detection"
Cohesion: 0.08
Nodes (44): Brand, BRANDS, faviconFor(), LinkIcon(), secondLevel(), SOURCE_ICON, SourceIcon(), BINARIES (+36 more)

### Community 4 - "Forms, Cards & Settings Panels"
Cohesion: 0.10
Nodes (27): AgentFormFields(), Modal(), ChangePasswordForm(), Card(), CardAction(), CardContent(), CardDescription(), CardFooter() (+19 more)

### Community 5 - "Run Models & Provider Badges"
Cohesion: 0.08
Nodes (32): ProviderMark(), MODE_LABEL, Phase, phasesFrom(), ProviderChip(), RunModels(), STAGE_BAR, ProviderOrderRow (+24 more)

### Community 6 - "Package Manifest & Dev Dependencies"
Cohesion: 0.05
Nodes (37): @biomejs/biome, drizzle-kit, devDependencies, @biomejs/biome, drizzle-kit, tailwindcss, @tailwindcss/postcss, @types/bun (+29 more)

### Community 7 - "API Route Handlers & Schemas"
Cohesion: 0.08
Nodes (30): app, DELETE, GET, PATCH, POST, PUT, PromptKey, ingest() (+22 more)

### Community 8 - "Transcription Providers"
Cohesion: 0.12
Nodes (26): NoTranscriptionKeyError, ResolvedProvider, resolveProvider(), transcribe(), Transcription, providers, TRANSCRIPTION_ORDER, transcriptionProvider (+18 more)

### Community 9 - "Biome Lint & Format Config"
Cohesion: 0.06
Nodes (32): css, parser, next, react, files, includes, formatter, enabled (+24 more)

### Community 10 - "Row Actions & Alert Dialogs"
Cohesion: 0.18
Nodes (19): DeleteRun(), ProviderOrderRowProps, AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter() (+11 more)

### Community 11 - "Agent Form State"
Cohesion: 0.10
Nodes (24): AgentFormDialog(), onOpenChange(), initialModeFor(), AgentStatusToggle(), DeleteAgent(), AgentFormMode, DEFAULT_CONFIG, DEFAULT_SCHEMA (+16 more)

### Community 12 - "User Menu & Avatar Components"
Cohesion: 0.09
Nodes (23): NavUser(), ProfileCard(), Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage() (+15 more)

### Community 13 - "TypeScript Compiler Config"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, next.config.ts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts (+22 more)

### Community 14 - "Credential Crypto & Cookie Vault"
Cohesion: 0.12
Nodes (25): db, decrypt(), encrypt(), EncryptedPayload, getMasterKey(), credentials, CredentialType, persistRotation() (+17 more)

### Community 15 - "Modal & Dialog Shell"
Cohesion: 0.14
Nodes (23): ACCENT, ModalAccent, ModalProps, ModalSize, SIZE, Dialog(), DialogClose(), DialogContent() (+15 more)

### Community 16 - "Extraction Chat Passes"
Cohesion: 0.12
Nodes (24): attemptPass(), ChatRun, disposition(), NoExtractionKeyError, PassResult, retryAfterMs(), runChat(), chatProvider (+16 more)

### Community 17 - "Extraction Orchestration & Routing"
Cohesion: 0.14
Nodes (26): SkippedModel, compactSchemaForPrompt(), asObject(), buildSystem(), extract(), Extraction, ExtractionError, formatTranscript() (+18 more)

### Community 18 - "Document Tree & Notion Publish"
Cohesion: 0.13
Nodes (24): VerificationSummary, buildDocument(), DocNode, FACT_FIELDS, itemLine(), LEAD_FIELDS, RelayDocument, sectionFor() (+16 more)

### Community 19 - "Root Layout & Telemetry Providers"
Cohesion: 0.10
Nodes (22): fontMono, metadata, oxaniumHeading, RootLayout(), spaceGrotesk, ErrorBoundaryState, TelemetryErrorBoundary, TelemetryProvider() (+14 more)

### Community 20 - "Evidence Schema Contract"
Cohesion: 0.10
Nodes (19): COMPACT_EVIDENCE, Evidence, EVIDENCE_SCHEMA, EvidenceKind, isEvidence(), isTranscriptEvidence(), isVisualEvidence(), SchemaFragment (+11 more)

### Community 21 - "Login Page & Build Scripts"
Cohesion: 0.10
Nodes (15): attempt(), CHAIN, FIXTURES, label(), main(), LoginForm(), metadata, metadata (+7 more)

### Community 22 - "Worker Process & Pipeline"
Cohesion: 0.19
Nodes (18): worker, sourceLabel(), logger, codeOf(), descriptionOf(), isPermanent(), messageOf(), titleOf() (+10 more)

### Community 23 - "Resizable Panels & Tabs"
Cohesion: 0.11
Nodes (17): ResizableHandle(), ResizablePanelGroup(), Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), AddCredentialDialog() (+9 more)

### Community 24 - "Changelog: Extraction & Notion"
Cohesion: 0.11
Nodes (23): 0.2.0 - Credentials Dashboard & Notion Ray, Task 4.4-4.6: Extraction, Grounding & Notion Publishing, Document tree and Notion publish (Task 4.6), The evidence contract is structural, not requested, Evidence verification (Task 4.5), Planned Task 4.3b: frame/vision extraction (amends PRD §5), Groq free-tier TPM pressure and mitigations, Media ingest gotchas (ffmpeg exit 8, Bun $ newline, rm no-op) (+15 more)

### Community 25 - "ShadCN Component Registry Config"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 26 - "Extraction Findings UI"
Cohesion: 0.16
Nodes (18): ClaimFinding, REASON_TEXT, Item(), RunExtraction(), countEvidence(), Evidence, evidenceRange(), ExtractedField (+10 more)

### Community 27 - "Drizzle Database Schema"
Cohesion: 0.10
Nodes (20): Agent, authSessions, authUsers, authVerifications, Credential, NewAgent, NewCredential, NewRelayRun (+12 more)

### Community 28 - "Logging & OpenObserve Observability"
Cohesion: 0.13
Nodes (14): flushAll(), isSensitiveKey(), LogEventInput, logFileStream, LogLevel, OpenObserveConfig, openObserveMiddleware(), OpenObserveStream (+6 more)

### Community 29 - "Transcript Normalise & Verify"
Cohesion: 0.16
Nodes (17): normalise(), NormalisedTranscript, normaliseTranscript(), check(), contentWords(), Finding, isRecord(), pointerSegment() (+9 more)

### Community 30 - "Agent CRUD & Name Guard"
Cohesion: 0.24
Nodes (15): DuplicateAgentNameError, nameTaken(), createAgent(), deleteAgent(), listAgents(), setAgentActive(), toSummary(), updateAgent() (+7 more)

### Community 31 - "Model Catalog Cache"
Cohesion: 0.18
Nodes (18): CachedCatalog, catalogFor(), credentialStamp(), fetchModels(), invalidateCatalog(), readCache(), warm(), writeCache() (+10 more)

### Community 32 - "Queue Admission & Capture Security"
Cohesion: 0.14
Nodes (19): Queue admission control (src/lib/queue/admission.ts), Capture security model (loopback CDP, ticket, fenced navigation), Deferral via moveToDelayed + DelayedError, Deferred: social cookie credentials (2026-08-31 decision), Per-user slot semaphore (fairness), Per-credential rate budget as a rolling window, Zod validates all external input at the API boundary, Branch A: yt-dlp-only consolidation (+11 more)

### Community 33 - "Prompts Page & Data"
Cohesion: 0.17
Nodes (14): dynamic, metadata, PromptsData(), PromptCard(), PromptsList(), CARDS, PromptsSkeleton(), listPrompts() (+6 more)

### Community 34 - "Run Detail & Facts"
Cohesion: 0.18
Nodes (15): dateFormat, RunDetailHeader(), RunDetail(), Fact, FactList(), numberFormat, processingFacts(), seconds() (+7 more)

### Community 35 - "UI Philosophy & Component Rules"
Cohesion: 0.13
Nodes (18): 0.1.0 - Foundation & Database, Component strictness: zero native form elements, GSAP animation standards (useGSAP, guarded refs), ShadCN preset b5pFrsf5Vq (mira/zinc/emerald), Typography & iconography (Oxanium, Space Grotesk, JetBrains Mono, HugeIcons), Relay UI/UX philosophy (data-dense command center), Authenticated browser verification via signed auth_sessions cookie, Explicit Clone replaces copy-on-write for System agents (+10 more)

### Community 36 - "Redis Cache & Prompt Loading"
Cohesion: 0.22
Nodes (16): cached(), cacheKeys, client(), get(), globalForCache, invalidate(), keyFor(), put() (+8 more)

### Community 37 - "Deployment & Auth Changelog"
Cohesion: 0.16
Nodes (17): 0.3.0 - Coolify deployment & Drizzle Gateway, Authentication & Observability (Better Auth, Pino, Rays rebrand), Deployment: deps/builder/runtime Dockerfile stages, Relay Changelog, OpenObserve observability (client RUM + server logs), CAPTURE_INTERNAL_TOKEN (dedicated inter-service secret), compose: capture service (Chromium, shm, seccomp), compose: dragonfly service (pinned, allow-undeclared-keys) (+9 more)

### Community 38 - "Toasts & Prompt Card"
Cohesion: 0.12
Nodes (10): ACCENT, FALLBACK, Textarea(), TOAST_TYPE_STYLES, ToastAction(), ToastClose(), ToastContent(), ToastDescription() (+2 more)

### Community 39 - "Binary Preflight & Capture Prereqs"
Cohesion: 0.14
Nodes (16): Source-scoped binary preflight (ensureMediaBinaries), Capture browser launch prerequisites (xauth, chromium-sandbox, seccomp), CAPTURE_PUBLIC_URL public wss route (open decision), Capture service as a third process (Phase 2), Three capture bugs found by testing, Instagram unblocked via instaloader, Three-tier link icon resolution, Media source registry (src/lib/media/sources.ts) (+8 more)

### Community 40 - "SQL Migrations"
Cohesion: 0.17
Nodes (10): `agents`, `auth_accounts`, `auth_sessions`, `auth_users`, `auth_verifications`, `credentials`, `relay_runs`, `model_catalog` (+2 more)

### Community 41 - "Credential Storage & Security Rules"
Cohesion: 0.17
Nodes (15): additional_data reduced to a derived `stale` boolean, BYOK encrypted credential vault, Security rule: encrypted tokens, plaintext meta_data, never logged, §3.2 expires_at is a floor on uselessness, §4.4 Capture logging allowlist, §3.3 What must never enter meta_data, §3.5 Migration: NONE (Drizzle enum is TypeScript-level), §3.4 Reconnect works with no new code (+7 more)

### Community 42 - "Runs Queries & New Run Dialog"
Cohesion: 0.21
Nodes (13): NewRunDialog(), fetchRun(), fetchRuns(), hasActiveRuns(), runDetailQueryOptions(), runsQueryOptions(), useCreateRun(), useRun() (+5 more)

### Community 43 - "Run Status & Stage Timeline"
Cohesion: 0.20
Nodes (12): DOT, formatMs(), RunStageTimeline(), STAGE_ICON, StageState, RunStatusBadge(), RunStatus, PIPELINE_STAGES (+4 more)

### Community 44 - "Redis Connection, Queue & Tickets"
Cohesion: 0.23
Nodes (12): issueTicket(), key(), redeemTicket(), redis(), TicketClaims, createRedis(), getRedis(), globalForRedis (+4 more)

### Community 45 - "Dashboard Pages & Session Guard"
Cohesion: 0.16
Nodes (12): AgentsData(), AgentsPage(), dynamic, metadata, DashboardLayout(), PromptsPage(), VaultPage(), AgentsTable() (+4 more)

### Community 46 - "Linkify & Transcript Panels"
Cohesion: 0.20
Nodes (11): ExternalLink(), hostOf(), Linkify(), Token, tokenize(), PublishedPanel(), RunTranscript(), Segment (+3 more)

### Community 47 - "Better Auth & Session Resolution"
Cohesion: 0.27
Nodes (8): { GET, POST }, Home(), LandingPage(), auth, authSchema, AuthSession, getRequestSession, getSessionFromHeaders()

### Community 48 - "Queue Admission Control"
Cohesion: 0.32
Nodes (12): acquire(), acquireUserSlot(), Admission, admitRun(), budgetKey(), chargeBudget(), checkWindow(), credentialLockKey() (+4 more)

### Community 49 - "Project Rules & Build Plan"
Cohesion: 0.20
Nodes (12): Next.js Agent Rules (read node_modules docs first), LLM Execution State (Relay task ledger), Stage completion derived from recorded timings, The stale-worker trap, Google Search Console site-verification file, Project layout (src/app, lib/db, observability, crypto, schemas), Relay README (stack, setup, layout), Relay stack table (Bun, Next.js, Hono, Drizzle, Zod, Biome) (+4 more)

### Community 50 - "Relay Brand Identity"
Cohesion: 0.33
Nodes (11): Public Static App Icon Asset, Square 1024x1024 App-Icon Canvas, Brand Palette: Emerald Green + Navy Accent on White, Arrow-Into-Stack Interlock Composition, Media Relay / Extraction Product Identity, Play / Forward-Arrow Triangle Motif, Relay Brand Mark (logo.png), Relay (Brand Name) (+3 more)

### Community 51 - "App Shell & Not Found"
Cohesion: 0.25
Nodes (6): metadata, ShellContent(), ShellHeader(), DashboardNotFoundPanel(), ScrollArea(), ScrollBar()

### Community 52 - "Settings Page & Query Client"
Cohesion: 0.27
Nodes (8): dynamic, metadata, SettingsPage(), QueryProvider(), SecurityCard(), authAccounts, getQueryClient(), makeQueryClient()

### Community 53 - "Vault Page & Credential Keys"
Cohesion: 0.29
Nodes (8): dynamic, metadata, VaultData(), CredentialsTableSkeleton(), VaultActions(), VaultNotices(), credentialKeys, listCredentials()

### Community 54 - "Ray OAuth Providers"
Cohesion: 0.31
Nodes (9): RayProviderId, configuredRayIds(), getProvider(), isConfigured(), providers, RayProvider, redirectUri(), stateCookieName() (+1 more)

### Community 55 - "Model Ranking & Provider Ordering"
Cohesion: 0.24
Nodes (10): Agent sprawl: the router was the cause, disposition(): 5xx is next-model, not fail, Gemini wired for extraction, The gemma `excludes` wrong turn, isolate() and the unterminated trailing fence, Capability-driven model ranking heuristics, Ollama local + cloud provider, Every prompt lives in the database with Redis hot cache (+2 more)

### Community 56 - "JSON Panel & Viewer"
Cohesion: 0.27
Nodes (7): JsonPanel(), onCopy(), useCollapseAll(), JSON_EDITOR_BASE, THEME, JsonInput(), JsonView()

### Community 57 - "Dynamic Schema Synthesizer"
Cohesion: 0.31
Nodes (9): compile(), describe(), FieldPlan, fromExisting(), isPlan(), isReuse(), Plan, Reuse (+1 more)

### Community 58 - "Notion Guides Target"
Cohesion: 0.36
Nodes (8): ensureCategoryPage(), ensureEntriesDataSource(), ensureGuidesTarget(), findGuidesDataSource(), GuidesTarget, NotionGuidesError, plainTitle(), titlePropertyName()

### Community 59 - "Runtime Dependencies"
Cohesion: 0.22
Nodes (9): @base-ui/react, @dnd-kit/utilities, hono, @openobserve/browser-rum, dependencies, @base-ui/react, @dnd-kit/utilities, hono (+1 more)

### Community 60 - "Run Detail Page"
Cohesion: 0.25
Nodes (8): dynamic, metadata, Params, RunData(), RunPage(), runKeys, getRun(), toDetail()

### Community 61 - "Provider Order Settings"
Cohesion: 0.36
Nodes (6): ProviderOrderCard(), settingKeys, extractionOrderQueryOptions(), fetchExtractionOrder(), useExtractionOrder(), useSaveExtractionOrder()

### Community 62 - "Runs Queue Page"
Cohesion: 0.33
Nodes (6): dynamic, metadata, QueuePage(), RunsData(), RunsTableSkeleton(), listRuns()

### Community 63 - "Cookie Jar Rotation & Locking"
Cohesion: 0.33
Nodes (6): Per-credential jar lock (correctness), Jar write-back on a FAILED download (bug), §3.6 getSecretByType (vault widening), §4.2 Jar rotation write-back (--cookies is read-write), §4.2 withSourceCookies (materialize and destroy), §4.2b YouTube's stricter cookie rules

### Community 64 - "Dashboard Catch-All Route"
Cohesion: 0.53
Nodes (5): DashboardCatchAll(), generateMetadata(), Params, sectionTitle(), titleCase()

### Community 65 - "Run Raw Data Collapsible"
Cohesion: 0.53
Nodes (4): RunRawData(), Collapsible(), CollapsibleContent(), CollapsibleTrigger()

### Community 66 - "YouTube 403 & yt-dlp Pin"
Cohesion: 0.60
Nodes (5): Phase 0: YouTube GVS 403 and player_client fallbacks, bun run verify:ytdlp acceptance test, §1.1b PO tokens rejected, §1.1 YouTube GVS 403 (settled by measurement), Risk #8: the yt-dlp pin is stale with no bump cadence

### Community 67 - "Database Smoke Test"
Cohesion: 0.40
Nodes (4): db, indexes, raw, tables

### Community 68 - "Run Detail Skeleton"
Cohesion: 0.40
Nodes (3): FACTS, RunDetailSkeleton(), STAGES

### Community 69 - "Capture Proxy & Tracing"
Cohesion: 0.60
Nodes (4): config, proxy(), redact(), sendTrace()

## Ambiguous Edges - Review These
- `Project layout (src/app, lib/db, observability, crypto, schemas)` → `Google Search Console site-verification file`  [AMBIGUOUS]
  public/google81b6e6165b427f27.html · relation: conceptually_related_to

## Knowledge Gaps
- **340 isolated node(s):** `$schema`, `enabled`, `clientKind`, `useIgnoreFile`, `src/**` (+335 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 453 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Project layout (src/app, lib/db, observability, crypto, schemas)` and `Google Search Console site-verification file`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `cn()` connect `App Sidebar & Navigation Chrome` to `Agents Table & Query States`, `Brand Icons & Binary Detection`, `Forms, Cards & Settings Panels`, `Run Models & Provider Badges`, `Row Actions & Alert Dialogs`, `Agent Form State`, `User Menu & Avatar Components`, `Modal & Dialog Shell`, `Root Layout & Telemetry Providers`, `Resizable Panels & Tabs`, `Extraction Findings UI`, `Prompts Page & Data`, `Run Detail & Facts`, `Toasts & Prompt Card`, `Run Status & Stage Timeline`, `Dashboard Pages & Session Guard`, `Linkify & Transcript Panels`, `App Shell & Not Found`, `JSON Panel & Viewer`, `Run Raw Data Collapsible`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `config` connect `Login Page & Build Scripts` to `App Sidebar & Navigation Chrome`, `Capture Service & CDP Client`, `Brand Icons & Binary Detection`, `Redis Cache & Prompt Loading`, `API Route Handlers & Schemas`, `Redis Connection, Queue & Tickets`, `Credential Crypto & Cookie Vault`, `Modal & Dialog Shell`, `Better Auth & Session Resolution`, `Extraction Chat Passes`, `Queue Admission Control`, `Root Layout & Telemetry Providers`, `Document Tree & Notion Publish`, `Worker Process & Pipeline`, `Ray OAuth Providers`, `Logging & OpenObserve Observability`, `Agent CRUD & Name Guard`, `Model Catalog Cache`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `getDb()` connect `Agent CRUD & Name Guard` to `Prompts Page & Data`, `Redis Cache & Prompt Loading`, `API Route Handlers & Schemas`, `Transcription Providers`, `Credential Crypto & Cookie Vault`, `Better Auth & Session Resolution`, `Extraction Chat Passes`, `Extraction Orchestration & Routing`, `Queue Admission Control`, `Settings Page & Query Client`, `Evidence Schema Contract`, `Worker Process & Pipeline`, `Vault Page & Credential Keys`, `Dynamic Schema Synthesizer`, `Run Detail Page`, `Runs Queue Page`, `Model Catalog Cache`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `$schema`, `enabled`, `clientKind` to the rest of the system?**
  _340 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Agents Table & Query States` be split into smaller, more focused modules?**
  _Cohesion score 0.07108478341355054 - nodes in this community are weakly interconnected._
- **Should `App Sidebar & Navigation Chrome` be split into smaller, more focused modules?**
  _Cohesion score 0.0579476861167002 - nodes in this community are weakly interconnected._
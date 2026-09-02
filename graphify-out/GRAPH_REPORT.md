# Graph Report - relay  (2026-09-02)

## Corpus Check
- 233 files · ~136,115 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1579 nodes · 3693 edges · 118 communities (77 shown, 39 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4aa6c0c0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- credentials-row.tsx
- sidebar.tsx
- Troubleshooting
- utils.ts
- profile-card.tsx
- import.ts
- scripts
- schemas.ts
- transcription/index.ts
- biome.json
- button.tsx
- query/agents.ts
- nav-user.tsx
- compilerOptions
- vault.ts
- import-session-dialog.tsx
- chat.ts
- evidence.ts
- ingest.ts
- observability/client.ts
- lib/providers.ts
- config/index.ts
- pipeline.ts
- add-credential-dialog.tsx
- Relay (PRD): short-form video to evidence-grounded Markdown
- components.json
- notion.ts
- schema.ts
- logger.ts
- json-panel.tsx
- extraction/route.ts
- verify.ts
- SESSION_AUTH: server-side cookie capture for social sources
- runs/page.tsx
- prompts/page.tsx
- Relay UI/UX philosophy (data-dense command center)
- catalog.ts
- compose: capture service (Chromium, shm, seccomp)
- toast.tsx
- §2.1 Capture runs in its own Bun process
- `auth_users`
- §3 Storage model (column mapping for a cookie credential)
- field.tsx
- cn
- extraction/index.ts
- lib/settings.ts
- [[...route]]/route.ts
- auth-session.ts
- logger
- Relay README (stack, setup, layout)
- Relay Brand Mark (logo.png)
- apiFetch
- binaries.ts
- run-detail.tsx
- rays.ts
- Gemini wired for extraction
- json-view.tsx
- settings/page.tsx
- admission.ts
- dependencies
- lib/runs.ts
- run-models.tsx
- getDb
- §4.2 withSourceCookies (materialize and destroy)
- agents/page.tsx
- verify-ytdlp.ts
- §1.1 YouTube GVS 403 (settled by measurement)
- vault/page.tsx
- media/cookies.ts
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
- EditCredentialDialog
- db/index.ts
- sheet.tsx
- schema-pipeline.ts
- models.ts
- download.ts
- requireSession
- OpenObserveStream

## God Nodes (most connected - your core abstractions)
1. `cn()` - 206 edges
2. `getDb()` - 54 edges
3. `config` - 33 edges
4. `Button()` - 31 edges
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

## Communities (118 total, 39 thin omitted)

### Community 0 - "credentials-row.tsx"
Cohesion: 0.07
Nodes (51): dateFormat, AgentsTableSkeleton(), ROWS, TypeBadge(), QueryErrorState(), QueryStatusBar(), QueryStatusBarProps, QueryStatusBarSkeleton() (+43 more)

### Community 1 - "sidebar.tsx"
Cohesion: 0.08
Nodes (34): AppSidebar(), NAV, ProfileUser, ThemeToggle(), Sidebar(), SidebarContent(), SidebarContext, SidebarContextProps (+26 more)

### Community 2 - "Troubleshooting"
Cohesion: 0.07
Nodes (27): 1. Open a private window, 1. Sign in, 2. Go to the export page, 2. Sign in to YouTube, 3. Export, 3. Navigate to robots.txt — in the same tab, 4. Export, then close the window immediately, 4. Upload (+19 more)

### Community 3 - "utils.ts"
Cohesion: 0.22
Nodes (9): Brand, BRANDS, faviconFor(), LinkIcon(), secondLevel(), SOURCE_ICON, SourceIcon(), Separator() (+1 more)

### Community 4 - "profile-card.tsx"
Cohesion: 0.18
Nodes (13): RunStatusBadge(), ChangePasswordForm(), Card(), CardAction(), CardContent(), CardDescription(), CardFooter(), CardHeader() (+5 more)

### Community 5 - "import.ts"
Cohesion: 0.12
Nodes (21): BROWSERS, CONNECT_STEPS, ConnectStepBody(), useBrowser(), MediaSourceId, SocialProviderInfo, cookieImportSchema, assertSerializable() (+13 more)

### Community 6 - "scripts"
Cohesion: 0.05
Nodes (36): @biomejs/biome, drizzle-kit, devDependencies, @biomejs/biome, drizzle-kit, tailwindcss, @tailwindcss/postcss, @types/bun (+28 more)

### Community 7 - "schemas.ts"
Cohesion: 0.14
Nodes (16): SUPPORTED_SOURCE_LABELS, credentialsQueryOptions(), fetchCredentials(), UpdateCredentialVariables, useCredentials(), agentInputSchema, agentUpdateSchema, AI_PROVIDER_IDS (+8 more)

### Community 8 - "transcription/index.ts"
Cohesion: 0.13
Nodes (25): NoTranscriptionKeyError, ResolvedProvider, resolveProvider(), transcribe(), Transcription, providers, TRANSCRIPTION_ORDER, transcriptionProvider (+17 more)

### Community 9 - "biome.json"
Cohesion: 0.06
Nodes (32): css, parser, next, react, files, includes, formatter, enabled (+24 more)

### Community 10 - "button.tsx"
Cohesion: 0.25
Nodes (17): DisabledActionSlot(), AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader() (+9 more)

### Community 11 - "query/agents.ts"
Cohesion: 0.11
Nodes (24): AgentFormDialog(), onOpenChange(), initialModeFor(), AgentFormFields(), AgentStatusToggle(), AgentFormMode, DEFAULT_CONFIG, DEFAULT_SCHEMA (+16 more)

### Community 12 - "nav-user.tsx"
Cohesion: 0.12
Nodes (17): NavUser(), ProfileCard(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuGroup(), DropdownMenuItem(), DropdownMenuLabel() (+9 more)

### Community 13 - "compilerOptions"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, next.config.ts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts (+22 more)

### Community 14 - "vault.ts"
Cohesion: 0.25
Nodes (12): encrypt(), CredentialType, ImportResult, createCredential(), CredentialMetaPatch, deleteCredential(), MASKED_COLUMNS, MaskedCredential (+4 more)

### Community 15 - "import-session-dialog.tsx"
Cohesion: 0.16
Nodes (20): ACCENT, ModalAccent, ModalProps, ModalSize, SIZE, NewRunDialog(), Dialog(), DialogClose() (+12 more)

### Community 16 - "chat.ts"
Cohesion: 0.18
Nodes (14): attemptPass(), ChatRun, disposition(), NoExtractionKeyError, PassResult, retryAfterMs(), runChat(), chatCompletion() (+6 more)

### Community 17 - "evidence.ts"
Cohesion: 0.10
Nodes (19): COMPACT_EVIDENCE, Evidence, EVIDENCE_SCHEMA, EvidenceKind, isEvidence(), isTranscriptEvidence(), isVisualEvidence(), SchemaFragment (+11 more)

### Community 18 - "ingest.ts"
Cohesion: 0.23
Nodes (14): BinaryVersions, ensureMediaBinaries(), IngestErrorCode, lastLine(), MediaIngestError, exists(), extractAudio(), ingest() (+6 more)

### Community 19 - "observability/client.ts"
Cohesion: 0.21
Nodes (11): ErrorBoundaryState, TelemetryErrorBoundary, TelemetryProvider(), alreadyInitialized(), browserOptions, ClientEvent, initTelemetry(), send() (+3 more)

### Community 20 - "lib/providers.ts"
Cohesion: 0.13
Nodes (23): ProviderMark(), ProviderOrderRow, ProviderOrderRowProps, ProviderCard(), ProviderCardProps, ProviderPicker(), RayProviderGrid(), SocialProviderGrid() (+15 more)

### Community 21 - "config/index.ts"
Cohesion: 0.15
Nodes (8): LoginForm(), metadata, metadata, AppConfig, config, PORT, YOUTUBE_CLIENTS, API_BASE

### Community 22 - "pipeline.ts"
Cohesion: 0.47
Nodes (8): codeOf(), descriptionOf(), isPermanent(), messageOf(), titleOf(), processRun(), isPermanentPublishError(), isPermanentTranscriptionError()

### Community 23 - "add-credential-dialog.tsx"
Cohesion: 0.26
Nodes (10): Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), AddCredentialDialog(), PANEL, TAB_ACCENT (+2 more)

### Community 24 - "Relay (PRD): short-form video to evidence-grounded Markdown"
Cohesion: 0.11
Nodes (23): 0.2.0 - Credentials Dashboard & Notion Ray, Task 4.4-4.6: Extraction, Grounding & Notion Publishing, Document tree and Notion publish (Task 4.6), The evidence contract is structural, not requested, Evidence verification (Task 4.5), Planned Task 4.3b: frame/vision extraction (amends PRD §5), Groq free-tier TPM pressure and mitigations, Media ingest gotchas (ffmpeg exit 8, Bun $ newline, rm no-op) (+15 more)

### Community 25 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 26 - "notion.ts"
Cohesion: 0.06
Nodes (49): ClaimFinding, REASON_TEXT, Item(), RunExtraction(), countEvidence(), Evidence, evidenceRange(), ExtractedField (+41 more)

### Community 27 - "schema.ts"
Cohesion: 0.15
Nodes (12): Agent, authSessions, authVerifications, Credential, credentials, NewAgent, NewCredential, NewRelayRun (+4 more)

### Community 28 - "logger.ts"
Cohesion: 0.16
Nodes (12): isSensitiveKey(), LogEventInput, logFileStream, LogLevel, OpenObserveConfig, openObserveMiddleware(), pino, pinoLogger (+4 more)

### Community 30 - "extraction/route.ts"
Cohesion: 0.14
Nodes (24): cacheKeys, loadPrompt(), PROMPT_SEEDS, promptFor(), PromptSeed, resetPrompt(), seedPrompts(), classify() (+16 more)

### Community 31 - "verify.ts"
Cohesion: 0.15
Nodes (18): normalise(), NormalisedTranscript, normaliseTranscript(), check(), contentWords(), Finding, isRecord(), pointerSegment() (+10 more)

### Community 32 - "SESSION_AUTH: server-side cookie capture for social sources"
Cohesion: 0.14
Nodes (19): Queue admission control (src/lib/queue/admission.ts), Capture security model (loopback CDP, ticket, fenced navigation), Deferral via moveToDelayed + DelayedError, Deferred: social cookie credentials (2026-08-31 decision), Per-user slot semaphore (fairness), Per-credential rate budget as a rolling window, Zod validates all external input at the API boundary, Branch A: yt-dlp-only consolidation (+11 more)

### Community 33 - "runs/page.tsx"
Cohesion: 0.16
Nodes (14): AgentsData(), dynamic, metadata, Params, RunData(), RunPage(), dynamic, metadata (+6 more)

### Community 34 - "prompts/page.tsx"
Cohesion: 0.15
Nodes (17): dynamic, metadata, PromptsData(), PromptsPage(), ACCENT, FALLBACK, PromptCard(), PromptsList() (+9 more)

### Community 35 - "Relay UI/UX philosophy (data-dense command center)"
Cohesion: 0.13
Nodes (18): 0.1.0 - Foundation & Database, Component strictness: zero native form elements, GSAP animation standards (useGSAP, guarded refs), ShadCN preset b5pFrsf5Vq (mira/zinc/emerald), Typography & iconography (Oxanium, Space Grotesk, JetBrains Mono, HugeIcons), Relay UI/UX philosophy (data-dense command center), Authenticated browser verification via signed auth_sessions cookie, Explicit Clone replaces copy-on-write for System agents (+10 more)

### Community 36 - "catalog.ts"
Cohesion: 0.21
Nodes (18): cached(), client(), get(), globalForCache, invalidate(), keyFor(), put(), readThrough() (+10 more)

### Community 37 - "compose: capture service (Chromium, shm, seccomp)"
Cohesion: 0.16
Nodes (17): 0.3.0 - Coolify deployment & Drizzle Gateway, Authentication & Observability (Better Auth, Pino, Rays rebrand), Deployment: deps/builder/runtime Dockerfile stages, Relay Changelog, OpenObserve observability (client RUM + server logs), CAPTURE_INTERNAL_TOKEN (dedicated inter-service secret), compose: capture service (Chromium, shm, seccomp), compose: dragonfly service (pinned, allow-undeclared-keys) (+9 more)

### Community 38 - "toast.tsx"
Cohesion: 0.09
Nodes (18): fontMono, metadata, oxaniumHeading, RootLayout(), spaceGrotesk, isTypingTarget(), ThemeHotkey(), onKeyDown() (+10 more)

### Community 39 - "§2.1 Capture runs in its own Bun process"
Cohesion: 0.14
Nodes (16): Source-scoped binary preflight (ensureMediaBinaries), Capture browser launch prerequisites (xauth, chromium-sandbox, seccomp), CAPTURE_PUBLIC_URL public wss route (open decision), Capture service as a third process (Phase 2), Three capture bugs found by testing, Instagram unblocked via instaloader, Three-tier link icon resolution, Media source registry (src/lib/media/sources.ts) (+8 more)

### Community 40 - "`auth_users`"
Cohesion: 0.17
Nodes (10): `agents`, `auth_accounts`, `auth_sessions`, `auth_users`, `auth_verifications`, `credentials`, `relay_runs`, `model_catalog` (+2 more)

### Community 41 - "§3 Storage model (column mapping for a cookie credential)"
Cohesion: 0.17
Nodes (15): additional_data reduced to a derived `stale` boolean, BYOK encrypted credential vault, Security rule: encrypted tokens, plaintext meta_data, never logged, §3.2 expires_at is a floor on uselessness, §4.4 Capture logging allowlist, §3.3 What must never enter meta_data, §3.5 Migration: NONE (Drizzle enum is TypeScript-level), §3.4 Reconnect works with no new code (+7 more)

### Community 42 - "field.tsx"
Cohesion: 0.15
Nodes (14): Field(), FieldContent(), FieldDescription(), FieldError(), FieldGroup(), FieldLegend(), FieldSeparator(), FieldSet() (+6 more)

### Community 43 - "cn"
Cohesion: 0.12
Nodes (25): Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), Breadcrumb(), BreadcrumbEllipsis() (+17 more)

### Community 44 - "extraction/index.ts"
Cohesion: 0.20
Nodes (17): SkippedModel, compactSchemaForPrompt(), asObject(), buildSystem(), extract(), Extraction, ExtractionError, formatTranscript() (+9 more)

### Community 45 - "lib/settings.ts"
Cohesion: 0.17
Nodes (15): chatProvider, ChatTask, EXTRACTION_ORDER, OLLAMA_CAPABILITIES, providers, AiKeyProviderId, isKeylessProvider(), extractionOrderSchema (+7 more)

### Community 46 - "[[...route]]/route.ts"
Cohesion: 0.11
Nodes (17): app, DELETE, GET, PATCH, POST, PUT, PromptKey, updatePrompt() (+9 more)

### Community 47 - "auth-session.ts"
Cohesion: 0.21
Nodes (10): { GET, POST }, Home(), LandingPage(), marquee, stories, auth, authSchema, AuthSession (+2 more)

### Community 48 - "logger"
Cohesion: 0.21
Nodes (12): worker, logger, createRedis(), getRedis(), globalForRedis, startWorkerHealthServer(), enqueueRun(), getRunsQueue() (+4 more)

### Community 49 - "Relay README (stack, setup, layout)"
Cohesion: 0.20
Nodes (12): Next.js Agent Rules (read node_modules docs first), LLM Execution State (Relay task ledger), Stage completion derived from recorded timings, The stale-worker trap, Google Search Console site-verification file, Project layout (src/app, lib/db, observability, crypto, schemas), Relay README (stack, setup, layout), Relay stack table (Bun, Next.js, Hono, Drizzle, Zod, Biome) (+4 more)

### Community 50 - "Relay Brand Mark (logo.png)"
Cohesion: 0.33
Nodes (11): Public Static App Icon Asset, Square 1024x1024 App-Icon Canvas, Brand Palette: Emerald Green + Navy Accent on White, Arrow-Into-Stack Interlock Composition, Media Relay / Extraction Product Identity, Play / Forward-Arrow Triangle Motif, Relay Brand Mark (logo.png), Relay (Brand Name) (+3 more)

### Community 51 - "apiFetch"
Cohesion: 0.20
Nodes (7): DeleteAgent(), DeleteRun(), DeleteCredential(), useDeleteAgent(), useDeleteCredential(), apiFetch(), useDeleteRun()

### Community 52 - "binaries.ts"
Cohesion: 0.31
Nodes (7): BINARIES, BinarySpec, detectBinary(), detected, firstLine(), MediaBinaryError, missingMessage()

### Community 53 - "run-detail.tsx"
Cohesion: 0.05
Nodes (50): ExternalLink(), hostOf(), Linkify(), Token, tokenize(), PublishedPanel(), dateFormat, RunDetailHeader() (+42 more)

### Community 54 - "rays.ts"
Cohesion: 0.24
Nodes (11): RayProviderId, rayCallbackSchema, configuredRayIds(), getProvider(), isConfigured(), providers, RayProvider, redirectUri() (+3 more)

### Community 55 - "Gemini wired for extraction"
Cohesion: 0.24
Nodes (10): Agent sprawl: the router was the cause, disposition(): 5xx is next-model, not fail, Gemini wired for extraction, The gemma `excludes` wrong turn, isolate() and the unterminated trailing fence, Capability-driven model ranking heuristics, Ollama local + cloud provider, Every prompt lives in the database with Redis hot cache (+2 more)

### Community 56 - "json-view.tsx"
Cohesion: 0.18
Nodes (11): JsonPanel(), onCopy(), useCollapseAll(), JSON_EDITOR_BASE, THEME, JsonInput(), JsonView(), RunRawData() (+3 more)

### Community 57 - "settings/page.tsx"
Cohesion: 0.19
Nodes (11): dynamic, metadata, SettingsPage(), ProviderOrderCard(), SecurityCard(), authAccounts, settingKeys, extractionOrderQueryOptions() (+3 more)

### Community 58 - "admission.ts"
Cohesion: 0.32
Nodes (12): acquire(), acquireUserSlot(), Admission, admitRun(), budgetKey(), chargeBudget(), checkWindow(), credentialLockKey() (+4 more)

### Community 59 - "dependencies"
Cohesion: 0.22
Nodes (9): @base-ui/react, @dnd-kit/utilities, hono, @openobserve/browser-rum, dependencies, @base-ui/react, @dnd-kit/utilities, hono (+1 more)

### Community 60 - "lib/runs.ts"
Cohesion: 0.28
Nodes (12): MEDIA_SOURCES, MediaSource, parseSourceUrl(), sourceLabel(), createRun(), deleteRun(), getRun(), listRuns() (+4 more)

### Community 61 - "run-models.tsx"
Cohesion: 0.29
Nodes (6): MODE_LABEL, Phase, phasesFrom(), ProviderChip(), RunModels(), STAGE_BAR

### Community 62 - "getDb"
Cohesion: 0.41
Nodes (10): DuplicateAgentNameError, nameTaken(), createAgent(), deleteAgent(), listAgents(), setAgentActive(), toSummary(), updateAgent() (+2 more)

### Community 63 - "§4.2 withSourceCookies (materialize and destroy)"
Cohesion: 0.33
Nodes (6): Per-credential jar lock (correctness), Jar write-back on a FAILED download (bug), §3.6 getSecretByType (vault widening), §4.2 Jar rotation write-back (--cookies is read-write), §4.2 withSourceCookies (materialize and destroy), §4.2b YouTube's stricter cookie rules

### Community 64 - "agents/page.tsx"
Cohesion: 0.24
Nodes (7): dynamic, metadata, metadata, AgentsTable(), ShellContent(), ShellHeader(), DashboardNotFoundPanel()

### Community 65 - "verify-ytdlp.ts"
Cohesion: 0.47
Nodes (5): attempt(), CHAIN, FIXTURES, label(), main()

### Community 66 - "§1.1 YouTube GVS 403 (settled by measurement)"
Cohesion: 0.60
Nodes (5): Phase 0: YouTube GVS 403 and player_client fallbacks, bun run verify:ytdlp acceptance test, §1.1b PO tokens rejected, §1.1 YouTube GVS 403 (settled by measurement), Risk #8: the yt-dlp pin is stale with no bump cadence

### Community 67 - "vault/page.tsx"
Cohesion: 0.26
Nodes (9): dynamic, metadata, VaultData(), VaultPage(), VaultActions(), VaultNotices(), agentKeys, credentialKeys (+1 more)

### Community 68 - "media/cookies.ts"
Cohesion: 0.29
Nodes (9): decrypt(), EncryptedPayload, getMasterKey(), persistRotation(), SourceCookies, withSourceCookies(), getSecretByType(), recordSessionOutcome() (+1 more)

### Community 69 - "proxy.ts"
Cohesion: 0.60
Nodes (4): config, proxy(), redact(), sendTrace()

### Community 110 - "EditCredentialDialog"
Cohesion: 0.60
Nodes (5): currentAccount(), EditCredentialDialog(), reset(), submit(), useUpdateCredential()

### Community 111 - "db/index.ts"
Cohesion: 0.18
Nodes (9): db, indexes, raw, tables, { construct }, { createClient }, createDb(), globalForDb (+1 more)

### Community 112 - "sheet.tsx"
Cohesion: 0.18
Nodes (7): Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetTitle()

### Community 113 - "schema-pipeline.ts"
Cohesion: 0.20
Nodes (9): authUsers, ModelCatalog, NewModelCatalog, NewPrompt, NewUserSetting, Prompt, prompts, UserSetting (+1 more)

### Community 114 - "models.ts"
Cohesion: 0.36
Nodes (9): asArray(), asNumber(), isFree(), normaliseCatalog(), normaliseModel(), parameterCount(), rankModels(), sizeScore() (+1 more)

### Community 115 - "download.ts"
Cohesion: 0.31
Nodes (9): download(), DownloadResult, downloadWithYtDlp(), DROPPED_INFO_KEYS, isPlaceholderTitle(), pruneInfo(), runYtDlp(), withSyntheticTitle() (+1 more)

### Community 116 - "requireSession"
Cohesion: 0.33
Nodes (8): AgentsPage(), DashboardCatchAll(), generateMetadata(), Params, sectionTitle(), titleCase(), DashboardLayout(), requireSession()

### Community 117 - "OpenObserveStream"
Cohesion: 0.48
Nodes (3): flushAll(), OpenObserveStream, installShutdownHandlers()

## Ambiguous Edges - Review These
- `Project layout (src/app, lib/db, observability, crypto, schemas)` → `Google Search Console site-verification file`  [AMBIGUOUS]
  public/google81b6e6165b427f27.html · relation: conceptually_related_to

## Knowledge Gaps
- **350 isolated node(s):** `$schema`, `enabled`, `clientKind`, `useIgnoreFile`, `src/**` (+345 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 460 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Project layout (src/app, lib/db, observability, crypto, schemas)` and `Google Search Console site-verification file`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `cn()` connect `cn` to `credentials-row.tsx`, `sidebar.tsx`, `utils.ts`, `profile-card.tsx`, `button.tsx`, `query/agents.ts`, `nav-user.tsx`, `import-session-dialog.tsx`, `lib/providers.ts`, `add-credential-dialog.tsx`, `notion.ts`, `json-panel.tsx`, `prompts/page.tsx`, `toast.tsx`, `field.tsx`, `run-detail.tsx`, `json-view.tsx`, `run-models.tsx`, `sheet.tsx`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Why does `config` connect `config/index.ts` to `sidebar.tsx`, `utils.ts`, `vault.ts`, `chat.ts`, `ingest.ts`, `notion.ts`, `logger.ts`, `extraction/route.ts`, `catalog.ts`, `toast.tsx`, `lib/settings.ts`, `[[...route]]/route.ts`, `auth-session.ts`, `logger`, `binaries.ts`, `rays.ts`, `admission.ts`, `verify-ytdlp.ts`, `media/cookies.ts`, `db/index.ts`, `download.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `getDb()` connect `getDb` to `prompts/page.tsx`, `vault/page.tsx`, `catalog.ts`, `media/cookies.ts`, `lib/settings.ts`, `[[...route]]/route.ts`, `db/index.ts`, `auth-session.ts`, `evidence.ts`, `logger`, `vault.ts`, `chat.ts`, `settings/page.tsx`, `admission.ts`, `lib/runs.ts`, `extraction/route.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `$schema`, `enabled`, `clientKind` to the rest of the system?**
  _350 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `credentials-row.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07394366197183098 - nodes in this community are weakly interconnected._
- **Should `sidebar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08048780487804878 - nodes in this community are weakly interconnected._
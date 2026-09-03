# Graph Report - relay  (2026-09-04)

## Corpus Check
- 300 files · ~242,602 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1895 nodes · 4504 edges · 134 communities (94 shown, 33 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f202b0f5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- runs-table.tsx
- sidebar.tsx
- Troubleshooting
- logger.ts
- extraction-chain-card.tsx
- shape.ts
- devDependencies
- Relay production runbook
- transcription/index.ts
- biome.json
- delete-agent.tsx
- query/agents.ts
- profile-card.tsx
- compilerOptions
- query-status.tsx
- lib/settings.ts
- agents/page.tsx
- evidence.ts
- ingest.ts
- app/layout.tsx
- import.ts
- config/index.ts
- settings/page.tsx
- extraction/index.ts
- Relay (PRD): short-form video to evidence-grounded Markdown
- components.json
- query/runs.ts
- schema.ts
- query/credentials.ts
- chat.ts
- retry-run.tsx
- verify.ts
- SESSION_AUTH: server-side cookie capture for social sources
- pipeline.ts
- prompts/page.tsx
- Relay Changelog
- catalog.ts
- compose: capture service (Chromium, shm, seccomp)
- Relay for Android — Trusted Web Activity wrapper
- No hardcoding rule
- `auth_users`
- §3 Storage model (column mapping for a cookie credential)
- new-run-dialog.tsx
- vault-select.ts
- pagination.tsx
- Egress proxy — YouTube from the production host
- lib/providers.ts
- admission.ts
- cn
- Relay README (stack, setup, layout)
- Relay Brand Mark (logo.png)
- notion-guides.ts
- provider-mark.tsx
- schemas.ts
- utils.ts
- Gemini wired for extraction
- vault/page.tsx
- run-logs-history.ts
- require-session.ts
- dependencies
- logger
- runs/page.tsx
- getDb
- credentials-row.tsx
- json-panel.tsx
- run-detail.tsx
- §7 Phased build plan (Phases 0-6)
- link-icon.tsx
- lib/runs.ts
- skip-paths.ts
- free-port.ts
- privacy/page.tsx
- terms/page.tsx
- best-effort-json-parser
- better-auth
- vault.ts
- bullmq
- cookie-import-steps.tsx
- scripts
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
- run-extraction.tsx
- next.config.ts
- next-themes
- [id]/page.tsx
- @openobserve/browser-logs
- pino
- react
- react-dom
- react-resizable-panels
- YouTube
- tailwind-merge
- @tanstack/react-query
- @thesvg/react
- tw-animate-css
- zod
- postcss.config.mjs
- Biome for lint+format, tsc only for typecheck
- Generous scale (desktop command center sizing)
- run-models.tsx
- rays.ts
- db/index.ts
- login/page.tsx
- linkify.tsx
- run-raw-data.tsx
- verify-ytdlp.ts
- extraction/route.ts
- package.json
- run-detail-skeleton.tsx
- LauncherActivity
- sw.js
- @dnd-kit/utilities
- run-logs.ts
- Application
- DelegationService
- gradlew
- @openobserve/browser-rum
- verify-proxy.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 228 edges
2. `getDb()` - 59 edges
3. `config` - 40 edges
4. `Button()` - 39 edges
5. `logger` - 32 edges
6. `providerLabel()` - 26 edges
7. `toast` - 20 edges
8. `Spinner()` - 18 edges
9. `requireSession()` - 18 edges
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

## Communities (134 total, 33 thin omitted)

### Community 0 - "runs-table.tsx"
Cohesion: 0.13
Nodes (20): DisabledActionSlot(), AGENT_COLUMNS, dateFormat, AgentsTableSkeleton(), TypeBadge(), DataColumn, DataTable(), QueryErrorState() (+12 more)

### Community 1 - "sidebar.tsx"
Cohesion: 0.06
Nodes (42): AppSidebar(), NAV, ProfileUser, ThemeToggle(), Separator(), Sheet(), SheetContent(), SheetDescription() (+34 more)

### Community 2 - "Troubleshooting"
Cohesion: 0.09
Nodes (21): 1. Sign in, 2. Go to the export page, 3. Export, 4. Upload, Before you start, Connecting a social account to Relay, Downloads worked, then started failing, Further reading (+13 more)

### Community 3 - "logger.ts"
Cohesion: 0.11
Nodes (14): flushAll(), LogEventInput, logFileStream, LogLevel, OpenObserveConfig, OpenObserveStream, pino, pinoLogger (+6 more)

### Community 4 - "extraction-chain-card.tsx"
Cohesion: 0.17
Nodes (12): PanelTone, TONE_TILE, SOURCE_ICON, SourceIcon(), Card(), CardAction(), CardContent(), CardDescription() (+4 more)

### Community 5 - "shape.ts"
Cohesion: 0.29
Nodes (12): countEvidence(), Evidence, evidenceRange(), humanise(), isRecord(), pointerSegment(), readEvidence(), readFields() (+4 more)

### Community 6 - "devDependencies"
Cohesion: 0.11
Nodes (19): @biomejs/biome, drizzle-kit, devDependencies, @biomejs/biome, drizzle-kit, tailwindcss, @tailwindcss/postcss, @types/bun (+11 more)

### Community 7 - "Relay production runbook"
Cohesion: 0.07
Nodes (26): 1. What is running, 2. The pipeline, 3. YouTube egress — the part most likely to break, 4.1 Read the run's own logs first, 4.2 Match the message, 4.3 Error classification, 4.4 The OpenObserve read path returns 401, 4.5 What is deliberately NOT shipped to OpenObserve (+18 more)

### Community 8 - "transcription/index.ts"
Cohesion: 0.12
Nodes (29): AiKeyProviderId, transcribe(), Transcription, providers, TRANSCRIPTION_ORDER, transcriptionProvider, transcriptionProviderIds(), Candidate (+21 more)

### Community 9 - "biome.json"
Cohesion: 0.06
Nodes (32): css, parser, next, react, files, includes, formatter, enabled (+24 more)

### Community 10 - "delete-agent.tsx"
Cohesion: 0.27
Nodes (13): DeleteRun(), AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader() (+5 more)

### Community 11 - "query/agents.ts"
Cohesion: 0.11
Nodes (23): AgentFormDialog(), onOpenChange(), initialModeFor(), AgentStatusToggle(), AgentsTable(), AgentFormMode, DEFAULT_CONFIG, DEFAULT_SCHEMA (+15 more)

### Community 12 - "profile-card.tsx"
Cohesion: 0.10
Nodes (24): NavUser(), ProfileCard(), Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage() (+16 more)

### Community 13 - "compilerOptions"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, next.config.ts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts (+22 more)

### Community 14 - "query-status.tsx"
Cohesion: 0.20
Nodes (17): ROWS, QueryStatusBar(), QueryStatusBarProps, QueryStatusBarSkeleton(), relative, updatedAgo(), ROWS, Skeleton() (+9 more)

### Community 15 - "lib/settings.ts"
Cohesion: 0.29
Nodes (13): candidates(), resolveChain(), EXTRACTION_ORDER, forgetCredentialChain(), getCredentialChain(), getShareAutoRun(), legacyChainSeed(), readSetting() (+5 more)

### Community 16 - "agents/page.tsx"
Cohesion: 0.20
Nodes (9): AgentsData(), AgentsPage(), dynamic, metadata, metadata, ShellContent(), ShellHeader(), DashboardNotFoundPanel() (+1 more)

### Community 17 - "evidence.ts"
Cohesion: 0.10
Nodes (19): COMPACT_EVIDENCE, Evidence, EVIDENCE_SCHEMA, EvidenceKind, isEvidence(), isTranscriptEvidence(), isVisualEvidence(), SchemaFragment (+11 more)

### Community 18 - "ingest.ts"
Cohesion: 0.06
Nodes (60): BINARIES, BinarySpec, BinaryVersions, detectBinary(), detected, ensureMediaBinaries(), firstLine(), MediaBinaryError (+52 more)

### Community 19 - "app/layout.tsx"
Cohesion: 0.09
Nodes (24): fontMono, metadata, oxaniumHeading, RootLayout(), spaceGrotesk, viewport, ServiceWorker(), ErrorBoundaryState (+16 more)

### Community 20 - "import.ts"
Cohesion: 0.18
Nodes (17): MediaSourceId, SocialProviderInfo, cookieImportSchema, assertSerializable(), inScope(), isComplete(), SerializedJar, toNetscapeJar() (+9 more)

### Community 21 - "config/index.ts"
Cohesion: 0.14
Nodes (10): metadata, LandingPage(), marquee, MARQUEE_LOOP, stories, AppConfig, config, PORT (+2 more)

### Community 22 - "settings/page.tsx"
Cohesion: 0.24
Nodes (9): dynamic, metadata, SettingsPage(), VaultData(), QueryProvider(), SecurityCard(), getQueryClient(), makeQueryClient() (+1 more)

### Community 23 - "extraction/index.ts"
Cohesion: 0.18
Nodes (17): NoExtractionKeyError, compactSchemaForPrompt(), asObject(), buildSystem(), extract(), Extraction, ExtractionError, formatTranscript() (+9 more)

### Community 24 - "Relay (PRD): short-form video to evidence-grounded Markdown"
Cohesion: 0.15
Nodes (17): Task 4.4-4.6: Extraction, Grounding & Notion Publishing, Document tree and Notion publish (Task 4.6), Evidence verification (Task 4.5), Groq free-tier TPM pressure and mitigations, Media ingest gotchas (ffmpeg exit 8, Bun $ newline, rm no-op), OpenRouter is 6-15x slower than Groq, Transcription gotchas (Whisper fabrication, no_speech_prob gate), Agent routing & extraction (System / Human agents) (+9 more)

### Community 25 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 26 - "query/runs.ts"
Cohesion: 0.06
Nodes (50): ExistingRun, metadata, SharePage(), clearPendingShare(), readPendingShare(), StoredShare, writePendingShare(), candidates() (+42 more)

### Community 27 - "schema.ts"
Cohesion: 0.10
Nodes (20): Agent, authAccounts, authSessions, authUsers, authVerifications, Credential, NewAgent, NewCredential (+12 more)

### Community 28 - "query/credentials.ts"
Cohesion: 0.12
Nodes (18): DeleteAgent(), DeleteCredential(), currentAccount(), EditCredentialDialog(), reset(), submit(), useDeleteAgent(), credentialsQueryOptions() (+10 more)

### Community 29 - "chat.ts"
Cohesion: 0.17
Nodes (20): attemptKey(), AttemptOptions, ChatRun, KeyAttempt, attemptPass(), disposition, MAX_CANDIDATES, retryAfterMs() (+12 more)

### Community 30 - "retry-run.tsx"
Cohesion: 0.25
Nodes (11): canRetry(), RetryRun(), TERMINAL, RunDetailHeader(), RunsTable(), Tooltip(), TooltipContent(), TooltipTrigger() (+3 more)

### Community 31 - "verify.ts"
Cohesion: 0.16
Nodes (17): normalise(), NormalisedTranscript, normaliseTranscript(), check(), contentWords(), Finding, isRecord(), pointerSegment() (+9 more)

### Community 32 - "SESSION_AUTH: server-side cookie capture for social sources"
Cohesion: 0.13
Nodes (21): Queue admission control (src/lib/queue/admission.ts), Source-scoped binary preflight (ensureMediaBinaries), Capture security model (loopback CDP, ticket, fenced navigation), Deferral via moveToDelayed + DelayedError, Deferred: social cookie credentials (2026-08-31 decision), Instagram unblocked via instaloader, Per-user slot semaphore (fairness), Per-credential rate budget as a rolling window (+13 more)

### Community 33 - "pipeline.ts"
Cohesion: 0.29
Nodes (13): analyseMedia(), analysisRecord(), NoFrameTextError, readFrames(), setRunStage(), codeOf(), descriptionOf(), isPermanent() (+5 more)

### Community 34 - "prompts/page.tsx"
Cohesion: 0.17
Nodes (14): dynamic, metadata, PromptsData(), PromptCard(), PromptsList(), CARDS, PromptsSkeleton(), listPrompts() (+6 more)

### Community 35 - "Relay Changelog"
Cohesion: 0.10
Nodes (21): 0.1.0 - Foundation & Database, 0.2.0 - Credentials Dashboard & Notion Ray, 0.3.0 - Coolify deployment & Drizzle Gateway, Authentication & Observability (Better Auth, Pino, Rays rebrand), Relay Changelog, Component strictness: zero native form elements, GSAP animation standards (useGSAP, guarded refs), OpenObserve observability (client RUM + server logs) (+13 more)

### Community 36 - "catalog.ts"
Cohesion: 0.14
Nodes (26): cached(), cacheKeys, client(), get(), globalForCache, invalidate(), keyFor(), put() (+18 more)

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
Cohesion: 0.14
Nodes (23): ChangePasswordForm(), Dialog(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogTitle(), DialogTrigger() (+15 more)

### Community 43 - "vault-select.ts"
Cohesion: 0.21
Nodes (16): decrypt(), EncryptedPayload, getMasterKey(), credentials, CredentialType, getCredentialIdByType(), getSecretByType(), StoredSecret (+8 more)

### Community 44 - "pagination.tsx"
Cohesion: 0.24
Nodes (12): PageSlot, pageWindow(), RunsPagination(), buttonVariants, Pagination(), PaginationContent(), PaginationEllipsis(), PaginationItem() (+4 more)

### Community 45 - "Egress proxy — YouTube from the production host"
Cohesion: 0.10
Nodes (19): 1. The measurement this exists for, 1a. The trap that cost an afternoon — and the wrong lesson drawn from it, 2. How it is wired, 3. THE MANUAL STEP, AND WHY THERE ISN'T ONE ANY MORE, 4. Operating it, 5. Failure modes and what they mean, 6. Security notes, 7. Open questions and honest caveats (+11 more)

### Community 46 - "lib/providers.ts"
Cohesion: 0.15
Nodes (12): ProviderCard(), ProviderCardProps, RayProviderGrid(), SocialProviderGrid(), AI_KEY_PROVIDERS, ALL_PROVIDERS, KEYED_AI_PROVIDERS, PROVIDER_IDS (+4 more)

### Community 47 - "admission.ts"
Cohesion: 0.13
Nodes (25): worker, processRun(), acquire(), acquireUserSlot(), Admission, admitRun(), budgetKey(), chargeBudget() (+17 more)

### Community 48 - "cn"
Cohesion: 0.09
Nodes (29): ModePicker(), MODES, Breadcrumb(), BreadcrumbEllipsis(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage() (+21 more)

### Community 49 - "Relay README (stack, setup, layout)"
Cohesion: 0.22
Nodes (9): Next.js Agent Rules (read node_modules docs first), The stale-worker trap, Google Search Console site-verification file, Project layout (src/app, lib/db, observability, crypto, schemas), Relay README (stack, setup, layout), Relay stack table (Bun, Next.js, Hono, Drizzle, Zod, Biome), Circuit breakers (3 files/step, typecheck gate, stop for approval), Code hygiene: 250-line cap and backend naming (+1 more)

### Community 50 - "Relay Brand Mark (logo.png)"
Cohesion: 0.33
Nodes (11): Public Static App Icon Asset, Square 1024x1024 App-Icon Canvas, Brand Palette: Emerald Green + Navy Accent on White, Arrow-Into-Stack Interlock Composition, Media Relay / Extraction Product Identity, Play / Forward-Arrow Triangle Motif, Relay Brand Mark (logo.png), Relay (Brand Name) (+3 more)

### Community 51 - "notion-guides.ts"
Cohesion: 0.36
Nodes (8): ensureCategoryPage(), ensureEntriesDataSource(), ensureGuidesTarget(), findGuidesDataSource(), GuidesTarget, NotionGuidesError, plainTitle(), titlePropertyName()

### Community 52 - "provider-mark.tsx"
Cohesion: 0.21
Nodes (13): ProviderMark(), ChainEntryRow, ChainEntryRowProps, ProviderPicker(), PROVIDER_MARKS, providerIcon, providerIconVariant(), ProviderIconWithVariant (+5 more)

### Community 53 - "schemas.ts"
Cohesion: 0.08
Nodes (29): app, DELETE, GET, PATCH, POST, PUT, PromptKey, ingest() (+21 more)

### Community 54 - "utils.ts"
Cohesion: 0.09
Nodes (31): AgentFormFields(), ACCENT, Modal(), ModalAccent, ModalProps, ModalSize, SIZE, ACCENT (+23 more)

### Community 55 - "Gemini wired for extraction"
Cohesion: 0.18
Nodes (14): Agent sprawl: the router was the cause, disposition(): 5xx is next-model, not fail, The evidence contract is structural, not requested, Planned Task 4.3b: frame/vision extraction (amends PRD §5), Gemini wired for extraction, The gemma `excludes` wrong turn, isolate() and the unterminated trailing fence, Capability-driven model ranking heuristics (+6 more)

### Community 56 - "vault/page.tsx"
Cohesion: 0.43
Nodes (5): dynamic, metadata, VaultActions(), VaultNotices(), credentialKeys

### Community 57 - "run-logs-history.ts"
Cohesion: 0.33
Nodes (6): DROPPED, LEVEL_NAME, levelName(), readRunLogsHistory(), SearchHit, RunLogLine

### Community 58 - "require-session.ts"
Cohesion: 0.31
Nodes (7): { GET, POST }, auth, authSchema, AuthSession, getRequestSession, guard(), requireSessionOrRedirect

### Community 59 - "dependencies"
Cohesion: 0.08
Nodes (25): @base-ui/react, @better-auth/drizzle-adapter, @cfworker/json-schema, class-variance-authority, clsx, @dnd-kit/sortable, gsap, @gsap/react (+17 more)

### Community 60 - "logger"
Cohesion: 0.17
Nodes (16): logger, DocNode, RelayDocument, factLine(), NotionBlock, richText(), TextOptions, toBlocks() (+8 more)

### Community 61 - "runs/page.tsx"
Cohesion: 0.33
Nodes (6): dynamic, metadata, QueuePage(), RunsData(), runKeys, listRuns()

### Community 62 - "getDb"
Cohesion: 0.41
Nodes (10): DuplicateAgentNameError, nameTaken(), createAgent(), deleteAgent(), listAgents(), setAgentActive(), toSummary(), updateAgent() (+2 more)

### Community 63 - "credentials-row.tsx"
Cohesion: 0.17
Nodes (19): accountEmailFor(), accountNameFor(), dateFormat, displayName(), metaString(), ProviderTile(), ReconnectSession(), RowActions() (+11 more)

### Community 64 - "json-panel.tsx"
Cohesion: 0.20
Nodes (9): JsonPanel(), onCopy(), useCollapseAll(), JSON_EDITOR_BASE, THEME, JsonInput(), JsonView(), ScrollArea() (+1 more)

### Community 65 - "run-detail.tsx"
Cohesion: 0.19
Nodes (15): dateFormat, RunDetail(), Fact, FactList(), numberFormat, processingFacts(), seconds(), sourceFacts() (+7 more)

### Community 66 - "§7 Phased build plan (Phases 0-6)"
Cohesion: 0.17
Nodes (16): Explicit Clone replaces copy-on-write for System agents, additional_data reduced to a derived `stale` boolean, Modal shell over DialogContent (src/components/modal.tsx), Phase 0: YouTube GVS 403 and player_client fallbacks, SESSION_EXPIRED classification (Phase 4), Turso/libSQL adoption and non-automatic migrations, bun run verify:ytdlp acceptance test, Bun-first mandate (Bun-native and Web-standard APIs) (+8 more)

### Community 67 - "link-icon.tsx"
Cohesion: 0.43
Nodes (6): Brand, BRANDS, faviconFor(), LinkIcon(), secondLevel(), sourceIdForHost()

### Community 68 - "lib/runs.ts"
Cohesion: 0.17
Nodes (19): AnalysisMode, ExtractedField, VerificationSummary, sourceLabel(), buildDocument(), chunkText(), FACT_FIELDS, itemLine() (+11 more)

### Community 69 - "skip-paths.ts"
Cohesion: 0.33
Nodes (7): SKIP_EXACT, SKIP_EXTENSIONS, skipRequestLog(), config, proxy(), redact(), sendTrace()

### Community 75 - "vault.ts"
Cohesion: 0.21
Nodes (15): encrypt(), credentialActiveSchema, credentialInputSchema, credentialUpdateSchema, createCredential(), CredentialMetaPatch, deleteCredential(), listCredentials() (+7 more)

### Community 77 - "cookie-import-steps.tsx"
Cohesion: 0.21
Nodes (11): BrowserGuide, BROWSERS, ConnectPlatform, DEFAULT_GUIDE, FIREFOX_ANDROID_STORE, useBrowserGuide(), CopyableUrl(), Note() (+3 more)

### Community 78 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, db:generate, db:migrate, db:studio, dev, format, lint (+6 more)

### Community 79 - "requireSession"
Cohesion: 0.23
Nodes (11): DashboardCatchAll(), generateMetadata(), Params, sectionTitle(), titleCase(), DashboardLayout(), PromptsPage(), VaultPage() (+3 more)

### Community 81 - "query/settings.ts"
Cohesion: 0.21
Nodes (12): accountFor(), ExtractionChainCard(), ShareCard(), ChainEntry, extractionChainQueryOptions(), fetchExtractionChain(), fetchShareAutoRun(), shareAutoRunQueryOptions() (+4 more)

### Community 83 - "screen-text.ts"
Cohesion: 0.27
Nodes (11): Analysis, ContactSheet, VISION_SCHEMA, VISION_SYSTEM, visionUserPrompt(), oneLine(), readScreenText(), ScreenReading (+3 more)

### Community 84 - "models.ts"
Cohesion: 0.36
Nodes (9): asArray(), asNumber(), isFree(), normaliseCatalog(), normaliseModel(), parameterCount(), rankModels(), sizeScore() (+1 more)

### Community 90 - "run-extraction.tsx"
Cohesion: 0.32
Nodes (5): ClaimFinding, REASON_TEXT, Item(), RunExtraction(), ExtractedItem

### Community 93 - "[id]/page.tsx"
Cohesion: 0.33
Nodes (6): dynamic, metadata, Params, RunData(), RunPage(), getRun()

### Community 99 - "YouTube"
Cohesion: 0.33
Nodes (6): 1. Open a private window, 2. Sign in to YouTube, 3. Navigate to robots.txt — in the same tab, 4. Export, then close the window immediately, 5. Upload, YouTube

### Community 110 - "run-models.tsx"
Cohesion: 0.29
Nodes (6): MODE_LABEL, Phase, phasesFrom(), ProviderChip(), RunModels(), STAGE_BAR

### Community 111 - "rays.ts"
Cohesion: 0.27
Nodes (10): RayProviderId, rayCallbackSchema, configuredRayIds(), getProvider(), isConfigured(), providers, RayProvider, redirectUri() (+2 more)

### Community 112 - "db/index.ts"
Cohesion: 0.18
Nodes (9): db, indexes, raw, tables, { construct }, { createClient }, createDb(), globalForDb (+1 more)

### Community 114 - "linkify.tsx"
Cohesion: 0.20
Nodes (11): ExternalLink(), hostOf(), Linkify(), Token, tokenize(), PublishedPanel(), RunTranscript(), Segment (+3 more)

### Community 115 - "run-raw-data.tsx"
Cohesion: 0.53
Nodes (4): RunRawData(), Collapsible(), CollapsibleContent(), CollapsibleTrigger()

### Community 116 - "verify-ytdlp.ts"
Cohesion: 0.47
Nodes (5): attempt(), CHAIN, FIXTURES, label(), main()

### Community 117 - "extraction/route.ts"
Cohesion: 0.19
Nodes (18): runChat(), classify(), forRouting(), requestedAgent(), routableAgents(), routeAgent(), RoutingMode, toRouting() (+10 more)

### Community 118 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 119 - "run-detail-skeleton.tsx"
Cohesion: 0.40
Nodes (3): FACTS, RunDetailSkeleton(), STAGES

### Community 120 - "LauncherActivity"
Cohesion: 0.48
Nodes (4): android.net.Uri, android.os.Bundle, Override, LauncherActivity

### Community 121 - "sw.js"
Cohesion: 0.33
Nodes (4): cacheFirst(), isImmutable(), OWNED_CACHES, PRECACHE_URLS

### Community 123 - "run-logs.ts"
Cohesion: 0.73
Nodes (5): appendRunLog(), dropRunLogs(), key(), readRunLogs(), redis()

### Community 127 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 132 - "verify-proxy.ts"
Cohesion: 0.16
Nodes (14): Check, checks, FAILURE_SHAPES, leaks, logRecord, serialized, openObserveMiddleware(), traceBody() (+6 more)

## Ambiguous Edges - Review These
- `Project layout (src/app, lib/db, observability, crypto, schemas)` → `Google Search Console site-verification file`  [AMBIGUOUS]
  public/google81b6e6165b427f27.html · relation: conceptually_related_to

## Knowledge Gaps
- **433 isolated node(s):** `$schema`, `enabled`, `clientKind`, `useIgnoreFile`, `src/**` (+428 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 560 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Project layout (src/app, lib/db, observability, crypto, schemas)` and `Google Search Console site-verification file`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `cn()` connect `cn` to `runs-table.tsx`, `sidebar.tsx`, `extraction-chain-card.tsx`, `delete-agent.tsx`, `query/agents.ts`, `profile-card.tsx`, `query-status.tsx`, `app/layout.tsx`, `query/runs.ts`, `retry-run.tsx`, `prompts/page.tsx`, `new-run-dialog.tsx`, `pagination.tsx`, `lib/providers.ts`, `provider-mark.tsx`, `utils.ts`, `credentials-row.tsx`, `json-panel.tsx`, `run-detail.tsx`, `link-icon.tsx`, `run-extraction.tsx`, `run-models.tsx`, `linkify.tsx`, `run-raw-data.tsx`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `config` connect `config/index.ts` to `sidebar.tsx`, `logger.ts`, `verify-proxy.ts`, `ingest.ts`, `app/layout.tsx`, `query/runs.ts`, `chat.ts`, `catalog.ts`, `vault-select.ts`, `admission.ts`, `schemas.ts`, `run-logs-history.ts`, `require-session.ts`, `logger`, `link-icon.tsx`, `vault.ts`, `rays.ts`, `db/index.ts`, `login/page.tsx`, `verify-ytdlp.ts`, `run-logs.ts`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `getDb()` connect `getDb` to `prompts/page.tsx`, `query/runs.ts`, `catalog.ts`, `lib/runs.ts`, `vault.ts`, `vault-select.ts`, `lib/settings.ts`, `db/index.ts`, `evidence.ts`, `admission.ts`, `runs/page.tsx`, `ingest.ts`, `schemas.ts`, `settings/page.tsx`, `extraction/route.ts`, `require-session.ts`, `[id]/page.tsx`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `$schema`, `enabled`, `clientKind` to the rest of the system?**
  _433 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `runs-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1310344827586207 - nodes in this community are weakly interconnected._
- **Should `sidebar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0593990216631726 - nodes in this community are weakly interconnected._
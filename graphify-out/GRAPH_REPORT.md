# Graph Report - relay  (2026-09-03)

## Corpus Check
- 284 files · ~229,254 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1827 nodes · 4229 edges · 122 communities (77 shown, 40 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `132404d5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- runs-table.tsx
- sidebar.tsx
- Troubleshooting
- verify-proxy.ts
- profile-card.tsx
- shape.ts
- scripts
- Relay production runbook
- transcription/index.ts
- biome.json
- button.tsx
- query/agents.ts
- nav-user.tsx
- compilerOptions
- auth-session.ts
- toast.tsx
- settings/page.tsx
- evidence.ts
- ingest.ts
- app/layout.tsx
- import.ts
- config/index.ts
- query/settings.ts
- utils.ts
- Relay (PRD): short-form video to evidence-grounded Markdown
- components.json
- query/runs.ts
- schema.ts
- query/credentials.ts
- chat.ts
- extraction/index.ts
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
- edit-credential-dialog.tsx
- vault.ts
- pagination.tsx
- Egress proxy — YouTube from the production host
- agents/page.tsx
- admission.ts
- cn
- Relay README (stack, setup, layout)
- Relay Brand Mark (logo.png)
- notion-guides.ts
- provider-mark.tsx
- schemas.ts
- [...catchAll]/page.tsx
- Gemini wired for extraction
- vault/page.tsx
- server/runs.ts
- require-session.ts
- dependencies
- notion.ts
- runs/page.tsx
- getDb
- YouTube
- run-detail.tsx
- §7 Phased build plan (Phases 0-6)
- document.ts
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
- run-models.tsx
- cookie-import-steps.tsx
- lib/providers.ts
- verify-ytdlp.ts
- logger.ts
- synthesize.ts
- LauncherActivity
- sw.js
- Application
- DelegationService
- gradlew

## God Nodes (most connected - your core abstractions)
1. `cn()` - 222 edges
2. `getDb()` - 56 edges
3. `config` - 39 edges
4. `Button()` - 38 edges
5. `logger` - 28 edges
6. `providerLabel()` - 23 edges
7. `toast` - 19 edges
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

## Communities (122 total, 40 thin omitted)

### Community 0 - "runs-table.tsx"
Cohesion: 0.06
Nodes (61): AGENT_COLUMNS, dateFormat, AgentsTableSkeleton(), ROWS, TypeBadge(), DataColumn, DataTable(), CARDS (+53 more)

### Community 1 - "sidebar.tsx"
Cohesion: 0.06
Nodes (42): AppSidebar(), NAV, ProfileUser, ThemeToggle(), Separator(), Sheet(), SheetContent(), SheetDescription() (+34 more)

### Community 2 - "Troubleshooting"
Cohesion: 0.09
Nodes (21): 1. Sign in, 2. Go to the export page, 3. Export, 4. Upload, Before you start, Connecting a social account to Relay, Downloads worked, then started failing, Further reading (+13 more)

### Community 3 - "verify-proxy.ts"
Cohesion: 0.16
Nodes (14): Check, checks, FAILURE_SHAPES, leaks, logRecord, serialized, openObserveMiddleware(), traceBody() (+6 more)

### Community 4 - "profile-card.tsx"
Cohesion: 0.16
Nodes (15): PanelTone, TONE_TILE, SOURCE_ICON, SourceIcon(), ChangePasswordForm(), Card(), CardAction(), CardContent() (+7 more)

### Community 5 - "shape.ts"
Cohesion: 0.16
Nodes (18): ClaimFinding, REASON_TEXT, Item(), RunExtraction(), countEvidence(), Evidence, evidenceRange(), ExtractedField (+10 more)

### Community 6 - "scripts"
Cohesion: 0.05
Nodes (37): @biomejs/biome, drizzle-kit, devDependencies, @biomejs/biome, drizzle-kit, tailwindcss, @tailwindcss/postcss, @types/bun (+29 more)

### Community 7 - "Relay production runbook"
Cohesion: 0.07
Nodes (26): 1. What is running, 2. The pipeline, 3. YouTube egress — the part most likely to break, 4.1 Read the run's own logs first, 4.2 Match the message, 4.3 Error classification, 4.4 The OpenObserve read path returns 401, 4.5 What is deliberately NOT shipped to OpenObserve (+18 more)

### Community 8 - "transcription/index.ts"
Cohesion: 0.12
Nodes (26): AiKeyProviderId, NoTranscriptionKeyError, ResolvedProvider, resolveProvider(), transcribe(), Transcription, providers, TRANSCRIPTION_ORDER (+18 more)

### Community 9 - "biome.json"
Cohesion: 0.06
Nodes (32): css, parser, next, react, files, includes, formatter, enabled (+24 more)

### Community 10 - "button.tsx"
Cohesion: 0.18
Nodes (20): DisabledActionSlot(), DeleteRun(), canRetry(), RetryRun(), TERMINAL, RunDetailHeader(), AlertDialog(), AlertDialogAction() (+12 more)

### Community 11 - "query/agents.ts"
Cohesion: 0.09
Nodes (27): AgentFormDialog(), onOpenChange(), initialModeFor(), AgentStatusToggle(), DeleteAgent(), AgentFormMode, DEFAULT_CONFIG, DEFAULT_SCHEMA (+19 more)

### Community 12 - "nav-user.tsx"
Cohesion: 0.12
Nodes (17): NavUser(), ProfileCard(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuGroup(), DropdownMenuItem(), DropdownMenuLabel() (+9 more)

### Community 13 - "compilerOptions"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, next.config.ts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts (+22 more)

### Community 14 - "auth-session.ts"
Cohesion: 0.25
Nodes (8): Home(), LandingPage(), marquee, MARQUEE_LOOP, stories, getRequestSession, getSessionFromHeaders(), guard()

### Community 15 - "toast.tsx"
Cohesion: 0.12
Nodes (11): ACCENT, FALLBACK, Badge(), badgeVariants, TOAST_TYPE_STYLES, ToastAction(), ToastClose(), ToastContent() (+3 more)

### Community 16 - "settings/page.tsx"
Cohesion: 0.23
Nodes (12): dynamic, metadata, SettingsPage(), ShellContent(), ShellHeader(), SecurityCard(), isKeylessProvider(), getExtractionOrder() (+4 more)

### Community 17 - "evidence.ts"
Cohesion: 0.10
Nodes (19): COMPACT_EVIDENCE, Evidence, EVIDENCE_SCHEMA, EvidenceKind, isEvidence(), isTranscriptEvidence(), isVisualEvidence(), SchemaFragment (+11 more)

### Community 18 - "ingest.ts"
Cohesion: 0.07
Nodes (53): BINARIES, BinarySpec, BinaryVersions, detectBinary(), detected, ensureMediaBinaries(), firstLine(), MediaBinaryError (+45 more)

### Community 19 - "app/layout.tsx"
Cohesion: 0.09
Nodes (24): fontMono, metadata, oxaniumHeading, RootLayout(), spaceGrotesk, viewport, ServiceWorker(), ErrorBoundaryState (+16 more)

### Community 20 - "import.ts"
Cohesion: 0.19
Nodes (16): MediaSourceId, SocialProviderInfo, assertSerializable(), inScope(), isComplete(), SerializedJar, toNetscapeJar(), CookieImportError (+8 more)

### Community 21 - "config/index.ts"
Cohesion: 0.10
Nodes (17): LoginForm(), metadata, metadata, AppConfig, config, PORT, YOUTUBE_CLIENTS, RayProviderId (+9 more)

### Community 22 - "query/settings.ts"
Cohesion: 0.23
Nodes (11): ProviderOrderCard(), ShareCard(), settingKeys, extractionOrderQueryOptions(), fetchExtractionOrder(), fetchShareAutoRun(), shareAutoRunQueryOptions(), useExtractionOrder() (+3 more)

### Community 23 - "utils.ts"
Cohesion: 0.10
Nodes (21): AgentFormFields(), Modal(), QueryStatusBarProps, relative, RunStatusBadge(), Spinner(), Tabs(), TabsContent() (+13 more)

### Community 24 - "Relay (PRD): short-form video to evidence-grounded Markdown"
Cohesion: 0.15
Nodes (17): Task 4.4-4.6: Extraction, Grounding & Notion Publishing, Document tree and Notion publish (Task 4.6), Evidence verification (Task 4.5), Groq free-tier TPM pressure and mitigations, Media ingest gotchas (ffmpeg exit 8, Bun $ newline, rm no-op), OpenRouter is 6-15x slower than Groq, Transcription gotchas (Whisper fabrication, no_speech_prob gate), Agent routing & extraction (System / Human agents) (+9 more)

### Community 25 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 26 - "query/runs.ts"
Cohesion: 0.06
Nodes (55): RunData(), ExistingRun, metadata, SharePage(), clearPendingShare(), readPendingShare(), StoredShare, writePendingShare() (+47 more)

### Community 27 - "schema.ts"
Cohesion: 0.10
Nodes (20): Agent, authAccounts, authSessions, authUsers, authVerifications, Credential, NewAgent, NewCredential (+12 more)

### Community 28 - "query/credentials.ts"
Cohesion: 0.43
Nodes (6): credentialsQueryOptions(), fetchCredentials(), UpdateCredentialVariables, useCredentials(), CredentialInput, CredentialUpdateInput

### Community 29 - "chat.ts"
Cohesion: 0.10
Nodes (28): attemptPass(), ChatRun, disposition(), NoExtractionKeyError, PassResult, retryAfterMs(), runChat(), asArray() (+20 more)

### Community 30 - "extraction/index.ts"
Cohesion: 0.15
Nodes (25): SkippedModel, compactSchemaForPrompt(), asObject(), buildSystem(), extract(), Extraction, ExtractionError, formatTranscript() (+17 more)

### Community 31 - "verify.ts"
Cohesion: 0.16
Nodes (16): normalise(), NormalisedTranscript, normaliseTranscript(), check(), contentWords(), Finding, isRecord(), pointerSegment() (+8 more)

### Community 32 - "SESSION_AUTH: server-side cookie capture for social sources"
Cohesion: 0.13
Nodes (21): Queue admission control (src/lib/queue/admission.ts), Source-scoped binary preflight (ensureMediaBinaries), Capture security model (loopback CDP, ticket, fenced navigation), Deferral via moveToDelayed + DelayedError, Deferred: social cookie credentials (2026-08-31 decision), Instagram unblocked via instaloader, Per-user slot semaphore (fairness), Per-credential rate budget as a rolling window (+13 more)

### Community 33 - "pipeline.ts"
Cohesion: 0.24
Nodes (15): VerificationSummary, verifyExtraction(), runDir(), withIngestedAudio(), setRunStage(), codeOf(), descriptionOf(), isPermanent() (+7 more)

### Community 34 - "prompts/page.tsx"
Cohesion: 0.16
Nodes (15): dynamic, metadata, PromptsData(), PromptsPage(), PromptCard(), PromptsList(), PromptsSkeleton(), listPrompts() (+7 more)

### Community 35 - "Relay Changelog"
Cohesion: 0.10
Nodes (21): 0.1.0 - Foundation & Database, 0.2.0 - Credentials Dashboard & Notion Ray, 0.3.0 - Coolify deployment & Drizzle Gateway, Authentication & Observability (Better Auth, Pino, Rays rebrand), Relay Changelog, Component strictness: zero native form elements, GSAP animation standards (useGSAP, guarded refs), OpenObserve observability (client RUM + server logs) (+13 more)

### Community 36 - "catalog.ts"
Cohesion: 0.15
Nodes (24): cached(), cacheKeys, client(), get(), globalForCache, invalidate(), keyFor(), put() (+16 more)

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

### Community 42 - "edit-credential-dialog.tsx"
Cohesion: 0.11
Nodes (29): ACCENT, ModalAccent, ModalProps, ModalSize, SIZE, Dialog(), DialogClose(), DialogContent() (+21 more)

### Community 43 - "vault.ts"
Cohesion: 0.18
Nodes (15): decrypt(), encrypt(), EncryptedPayload, getMasterKey(), credentials, CredentialType, ImportResult, createCredential() (+7 more)

### Community 44 - "pagination.tsx"
Cohesion: 0.24
Nodes (12): PageSlot, pageWindow(), RunsPagination(), buttonVariants, Pagination(), PaginationContent(), PaginationEllipsis(), PaginationItem() (+4 more)

### Community 45 - "Egress proxy — YouTube from the production host"
Cohesion: 0.10
Nodes (19): 1. The measurement this exists for, 1a. The trap that cost an afternoon — and the wrong lesson drawn from it, 2. How it is wired, 3. THE MANUAL STEP, AND WHY THERE ISN'T ONE ANY MORE, 4. Operating it, 5. Failure modes and what they mean, 6. Security notes, 7. Open questions and honest caveats (+11 more)

### Community 46 - "agents/page.tsx"
Cohesion: 0.27
Nodes (8): AgentsData(), dynamic, metadata, AgentsTable(), QueryProvider(), getQueryClient(), makeQueryClient(), agentKeys

### Community 47 - "admission.ts"
Cohesion: 0.15
Nodes (24): processRun(), acquire(), acquireUserSlot(), Admission, admitRun(), budgetKey(), chargeBudget(), checkWindow() (+16 more)

### Community 48 - "cn"
Cohesion: 0.10
Nodes (29): AlertDialogMedia(), AlertDialogOverlay(), Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage() (+21 more)

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
Cohesion: 0.19
Nodes (14): ProviderMark(), ProviderOrderRow, ProviderOrderRowProps, ProviderPicker(), PROVIDER_MARKS, providerIcon, providerIconVariant(), ProviderIconWithVariant (+6 more)

### Community 53 - "schemas.ts"
Cohesion: 0.07
Nodes (36): app, DELETE, GET, PATCH, POST, PUT, PromptKey, updatePrompt() (+28 more)

### Community 54 - "[...catchAll]/page.tsx"
Cohesion: 0.27
Nodes (7): DashboardCatchAll(), generateMetadata(), Params, sectionTitle(), titleCase(), metadata, DashboardNotFoundPanel()

### Community 55 - "Gemini wired for extraction"
Cohesion: 0.18
Nodes (14): Agent sprawl: the router was the cause, disposition(): 5xx is next-model, not fail, The evidence contract is structural, not requested, Planned Task 4.3b: frame/vision extraction (amends PRD §5), Gemini wired for extraction, The gemma `excludes` wrong turn, isolate() and the unterminated trailing fence, Capability-driven model ranking heuristics (+6 more)

### Community 56 - "vault/page.tsx"
Cohesion: 0.33
Nodes (7): dynamic, metadata, VaultData(), VaultActions(), VaultNotices(), credentialKeys, listCredentials()

### Community 57 - "server/runs.ts"
Cohesion: 0.21
Nodes (14): appendRunLog(), dropRunLogs(), DROPPED, LEVEL_NAME, levelName(), readRunLogsHistory(), SearchHit, key() (+6 more)

### Community 58 - "require-session.ts"
Cohesion: 0.36
Nodes (5): { GET, POST }, auth, authSchema, AuthSession, requireSessionOrRedirect

### Community 59 - "dependencies"
Cohesion: 0.22
Nodes (9): @base-ui/react, @dnd-kit/utilities, hono, @openobserve/browser-rum, dependencies, @base-ui/react, @dnd-kit/utilities, hono (+1 more)

### Community 60 - "notion.ts"
Cohesion: 0.18
Nodes (15): DocNode, RelayDocument, factLine(), NotionBlock, richText(), TextOptions, toBlocks(), toNotionBlocks() (+7 more)

### Community 61 - "runs/page.tsx"
Cohesion: 0.15
Nodes (15): AgentsPage(), DashboardLayout(), dynamic, metadata, Params, RunPage(), dynamic, metadata (+7 more)

### Community 62 - "getDb"
Cohesion: 0.17
Nodes (19): db, indexes, raw, tables, DuplicateAgentNameError, nameTaken(), createAgent(), deleteAgent() (+11 more)

### Community 63 - "YouTube"
Cohesion: 0.33
Nodes (6): 1. Open a private window, 2. Sign in to YouTube, 3. Navigate to robots.txt — in the same tab, 4. Export, then close the window immediately, 5. Upload, YouTube

### Community 65 - "run-detail.tsx"
Cohesion: 0.06
Nodes (43): JsonPanel(), onCopy(), useCollapseAll(), JSON_EDITOR_BASE, THEME, JsonInput(), JsonView(), Brand (+35 more)

### Community 66 - "§7 Phased build plan (Phases 0-6)"
Cohesion: 0.17
Nodes (16): Explicit Clone replaces copy-on-write for System agents, additional_data reduced to a derived `stale` boolean, Modal shell over DialogContent (src/components/modal.tsx), Phase 0: YouTube GVS 403 and player_client fallbacks, SESSION_EXPIRED classification (Phase 4), Turso/libSQL adoption and non-automatic migrations, bun run verify:ytdlp acceptance test, Bun-first mandate (Bun-native and Web-standard APIs) (+8 more)

### Community 67 - "document.ts"
Cohesion: 0.42
Nodes (9): buildDocument(), chunkText(), FACT_FIELDS, itemLine(), LEAD_FIELDS, sectionFor(), sentence(), stepNote() (+1 more)

### Community 69 - "skip-paths.ts"
Cohesion: 0.33
Nodes (7): SKIP_EXACT, SKIP_EXTENSIONS, skipRequestLog(), config, proxy(), redact(), sendTrace()

### Community 110 - "run-models.tsx"
Cohesion: 0.29
Nodes (6): MODE_LABEL, Phase, phasesFrom(), ProviderChip(), RunModels(), STAGE_BAR

### Community 112 - "cookie-import-steps.tsx"
Cohesion: 0.21
Nodes (11): BrowserGuide, BROWSERS, ConnectPlatform, DEFAULT_GUIDE, FIREFOX_ANDROID_STORE, useBrowserGuide(), CopyableUrl(), Note() (+3 more)

### Community 113 - "lib/providers.ts"
Cohesion: 0.17
Nodes (12): ProviderCard(), ProviderCardProps, RayProviderGrid(), SocialProviderGrid(), MEDIA_SOURCES, AI_KEY_PROVIDERS, ALL_PROVIDERS, PROVIDER_IDS (+4 more)

### Community 116 - "verify-ytdlp.ts"
Cohesion: 0.47
Nodes (5): attempt(), CHAIN, FIXTURES, label(), main()

### Community 117 - "logger.ts"
Cohesion: 0.10
Nodes (16): worker, flushAll(), LogEventInput, logFileStream, LogLevel, OpenObserveConfig, OpenObserveStream, pino (+8 more)

### Community 118 - "synthesize.ts"
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

## Ambiguous Edges - Review These
- `Project layout (src/app, lib/db, observability, crypto, schemas)` → `Google Search Console site-verification file`  [AMBIGUOUS]
  public/google81b6e6165b427f27.html · relation: conceptually_related_to

## Knowledge Gaps
- **429 isolated node(s):** `$schema`, `enabled`, `clientKind`, `useIgnoreFile`, `src/**` (+424 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 552 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Project layout (src/app, lib/db, observability, crypto, schemas)` and `Google Search Console site-verification file`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `cn()` connect `cn` to `runs-table.tsx`, `sidebar.tsx`, `run-detail.tsx`, `prompts/page.tsx`, `profile-card.tsx`, `shape.ts`, `button.tsx`, `edit-credential-dialog.tsx`, `nav-user.tsx`, `pagination.tsx`, `run-models.tsx`, `toast.tsx`, `query/agents.ts`, `lib/providers.ts`, `app/layout.tsx`, `provider-mark.tsx`, `utils.ts`, `query/runs.ts`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `config` connect `config/index.ts` to `sidebar.tsx`, `run-detail.tsx`, `verify-proxy.ts`, `require-session.ts`, `catalog.ts`, `vault.ts`, `auth-session.ts`, `admission.ts`, `ingest.ts`, `app/layout.tsx`, `verify-ytdlp.ts`, `schemas.ts`, `logger.ts`, `server/runs.ts`, `query/runs.ts`, `notion.ts`, `chat.ts`, `getDb`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `getDb()` connect `getDb` to `pipeline.ts`, `prompts/page.tsx`, `query/runs.ts`, `catalog.ts`, `vault.ts`, `admission.ts`, `settings/page.tsx`, `evidence.ts`, `chat.ts`, `ingest.ts`, `schemas.ts`, `synthesize.ts`, `vault/page.tsx`, `server/runs.ts`, `require-session.ts`, `runs/page.tsx`, `extraction/index.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `$schema`, `enabled`, `clientKind` to the rest of the system?**
  _429 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `runs-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.055651176133103844 - nodes in this community are weakly interconnected._
- **Should `sidebar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0593990216631726 - nodes in this community are weakly interconnected._
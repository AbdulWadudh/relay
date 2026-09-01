# LLM Execution State - Relay

- **Current Phase:** Tasks 4.4, 4.5 and 4.6 complete and COMMITTED (human approved the push on 2026-09-01, together with the Docker/Coolify work). The pipeline runs end to end for BOTH sources — verified on a real Instagram Reel after instaloader replaced yt-dlp for that source.
- **Completed Phases:** PRD, TRD, Agent Rules, Design Guidelines, Branding, **Task 1: Foundation & Database**, **Task 2: Credentials Dashboard & Notion Ray**, **Task 3: Agent Management System**, **Task 4.1: Media Ingest**, **Task 4.2: Run Persistence & Queue**, **Task 4.3: Transcription**, **Task 4.4: Agent Routing & Extraction**, **Task 4.5: Evidence Verification**, **Task 4.6: Document Tree & Notion Publish**

## Instagram Unblocked via instaloader (2026-09-01, human decision)

**Instagram works now. The first fully end-to-end run in the project's history — ingest → transcribe → route → extract → verify → publish — was an Instagram Reel.**

- **yt-dlp cannot fetch Reels anonymously; instaloader can.** Reproduced on the exact Reel a run had already failed on (`DauNJ7Hpwaa`): yt-dlp returns "rate-limit reached or login required", instaloader returns a 24.8 MB mp4 plus rich metadata, no login.
- **A zero-dependency path was tried first and does NOT exist.** Five anonymous routes tested from Bun `fetch`: GraphQL `doc_id` (403), the same with a csrftoken cookie bootstrap (**401 `require_login`**), `?__a=1&__d=dis` (404), `i.instagram.com/api/v1/media` (404), and `/embed/captioned/` (200 but a 620 KB JS shell with no media data). instaloader does more than a couple of requests; reimplementing it was not on the table.
- **Cost: Python in the image.** `oven/bun:1` was deliberately Python-free (ffmpeg from apt, yt-dlp as a self-contained binary). instaloader is pure Python with no standalone build, so the Dockerfile now installs `python3 python3-pip` and pins `instaloader==4.15.3`.
- **Preflight is now source-scoped.** `ensureMediaBinaries(sourceId)` skips binaries whose `sources` list excludes this run — a YouTube-only operator without instaloader must not be blocked by it.
- **Downloader dispatches on `parsed.source`** in `download.ts`; `instaloader.ts` maps Instagram's post JSON onto the same `source_info` shape `pruneInfo` produces for yt-dlp, so routing and the UI need no per-source branches. Instagram has no title field, so the caption's FIRST LINE becomes the title — that is what routing reads.
- **The cookie-capture work stays deferred as the fallback** (human decision). Anonymous access is rate-limited and will break; the login-shaped instaloader failures map onto the same `SOURCE_UNAVAILABLE` code yt-dlp's do, so it degrades rather than dies.
- **Photo-only posts** exit 0 and write a .jpg — treated as `SOURCE_UNAVAILABLE` ("no video track"), not a tool failure.

### Two real bugs this exposed

1. **An empty model response killed the run instead of falling through.** `chatCompletion` throws `LlmError(200, "Model returned an empty response")`, and `disposition()` had no case for a 2xx, so it fell to `"fail"` and rethrew — no next model, no next provider. A free OpenRouter model returned an empty 200 on this 90-second transcript and the run died twice (BullMQ retried, same result). Any `LlmError` with `status < 400` is now `"next-model"`: HTTP succeeded, so an unusable completion is a MODEL problem.
2. **The worker was running stale code**, exactly as RULES.md warns. The first Instagram run after the change failed with yt-dlp's error message because the worker still held the pre-instaloader `download.ts`. RESTART THE WORKER after any pipeline change — the symptom is a correct-looking failure with the *old* wording.

### Measured on the successful run (`4d0435ec`)

```
download 15.3s · audio_extract 0.18s · transcribe 1.3s · route 3.6s
extract 303.5s · verify 1ms · publish 2.4s · total 328.7s
```

- **Extraction took FIVE MINUTES** on `nvidia/nemotron-3-super-120b-a12b:free` via OpenRouter — one attempt, no retries, no skipped models, just slow. PRD §6 targets sub-30s for the whole pipeline. Groq does the same work in ~5s. **OpenRouter is still first in `EXTRACTION_ORDER`; moving Groq first is a one-line change and is now strongly indicated.**
- **Verification earned its keep on real data: 35 claims extracted, 28 verified, 7 flagged — all `TIMESTAMP_MISMATCH`.** The quotes were verbatim, but on a 20-segment transcript the model reused timestamps across ingredients, so the citations pointed at the wrong moments. Genuine catches, not false positives.
- Published 42 Notion blocks in 2.4s.

## Tasks 4.5 & 4.6 Completion Notes (2026-09-01)

### 4.5 Evidence verification

- **Two checks per claim**, in `src/lib/extraction/verify.ts`: the quote must appear in the English transcript after normalisation, AND the cited ms range must overlap the segments the quote was actually found in. The second check is only possible because `normalise.ts` keeps an offset table mapping the normalised transcript back to its segments.
- **The bar for `verified` is an EXACT normalised substring — there is no fuzzy threshold.** A similarity cutoff would let a paraphrase through, which is the one thing this feature exists to prevent. `tokenOverlap` is computed on failures ONLY, to label the reason: `QUOTE_ALTERED` (≥0.6 of the words present, so the model reworded a real quote) vs `QUOTE_NOT_FOUND` (invented).
- **Normalisation is lossy in FORM only, never in words**: NFKD, strip combining marks, lowercase, unify dash/quote variants, drop punctuation, collapse whitespace. Two different sentences cannot normalise to the same string, so a match is still evidence of a verbatim quote.
- **Bug found by the negative test:** dashes were normalised to `-` and KEPT, while commas were removed — so an em-dash quote ("water — add ginger") failed against the transcript's comma ("water, add ginger"). A dash is only content INSIDE a word ("2-3", "half-inch"); between spaces it is punctuation. Without the negative test this would have shipped as silent false flagging.
- **Flagged, not dropped** (human decision): the value stays in `result.extraction`, the finding is recorded in `additional_data.verification`, and both the run detail page and the published page mark it.
- **Verified against real output AND against deliberately corrupted evidence.** 8 negative cases: verbatim OK, formatting-only OK, paraphrase flagged, fabrication flagged, wrong timestamp flagged, empty flagged, visual tier flagged, nested-in-array reached. Real runs: 15/15 and 11/11 verified.

### 4.6 Document tree & Notion publish

- **`src/lib/render/document.ts` builds a TREE, never a Markdown string.** A string would force every future destination to re-parse structure it already had; the tree is what makes "a second Ray needs no rewrite" true. `notion-blocks.ts` is the only Notion-aware file, and a second Ray adds a sibling to it.
- **Evidence maps to a Notion `toggle` containing a `quote` block**, with the timestamp in the toggle's own summary so the range is readable while folded. Flagged claims get a `⚠️` prefix plus a yellow callout inside the toggle. NO Markdown is ever emitted, and nothing goes into a code block.
- **The parent page is DISCOVERED, not configured.** A Notion integration only sees what was shared with it, so `findParentPage` searches for a container page (parent `workspace` or `page_id`) in preference to a database row — writing into a user's database would have to satisfy that database's schema.
- **Verified end to end against the live Notion API.** Published run `ca63b6fd` → 15 document nodes → 16 top-level blocks (1 callout, 4 heading_2, 2 paragraph, 6 bulleted_list_item, 3 numbered_list_item; evidence toggles are children). Read back from the API to confirm the nesting: `bulleted_list_item > paragraph(quantity) + toggle > quote`. Steps became `numbered_list_item` because the ORDERED_FIELD heuristic matches the field name.
- `publish_ms` added to the `publishing` stage's timingKeys, so the last stage lights up automatically — the run detail page now shows all five stages complete.

### OpenRouter, now that a key exists

- **Works.** 425 models fetched, 11 eligible free ones (json + structured). Extraction ran on `nvidia/nemotron-3-super-120b-a12b:free` and `dots-studio/dots-3-note-preview:free`.
- **Ranking bug fixed, same class as the Groq one.** `liquid/lfm-2.5-2.6b:free` ranked 2nd for synthesis because an unparseable size scored 0 and 2.6 > 0 — a model that ADVERTISES being tiny outranked one that simply does not state a size (`z-ai/glm-5.2`). Unknown size is now scored as mid-sized (`ASSUMED_PARAMETERS = 30`), so declared-large > unknown > declared-small. Context is also capped at `SUFFICIENT_CONTEXT` before ranking: past ~64k it buys nothing for a transcript, and ranking on it put a 512k niche model above a frontier one.
- **`nvidia/nemotron-3-super-120b-a12b:free` intermittently 404s** ("Provider returned error") despite being in the catalog. The model fallthrough handles it — this is exactly what it is for — but it costs a wasted round-trip.
- **OpenRouter is 6–15x SLOWER than Groq.** Measured extraction wall time: 74s, 35s, 88s on OpenRouter vs ~5s on Groq. PRD §6 targets sub-30s for the WHOLE pipeline. OpenRouter is currently FIRST in `EXTRACTION_ORDER`; moving Groq first is a one-line change in `src/lib/extraction/providers.ts` and is worth considering.
- **Router quality varies by model:** on one run nemotron declined the Recipe agent for a chai recipe and synthesized a "Tea Recipe" agent instead. gpt-oss-120b routed the same transcript correctly every time.

### UI/UX changes made alongside

- **Explicit clone replaces copy-on-write** (human decision): a System agent is never edited or forked silently. One row button opens the dialog — tooltip "View / Clone" or "Edit / Clone" by type — System opens read-only with Close + Clone, Human opens editable with Close + Clone + Save. Clone switches mode IN PLACE and pre-fills a non-colliding name ("Recipe (copy)").
- **Row actions are uniform**: every row renders the same slots, with Delete disabled-and-explained on System rows. Hiding it left ragged rows where a gap read as a rendering failure.
- **New `Modal` shell** (`src/components/modal.tsx`): three-row grid, static header/footer, ScrollArea body. Built over `DialogContent` — an earlier hand-rolled portal + div looked identical but Base UI wires Escape, backdrop dismissal, focus trapping and `DialogClose` to its own Popup, so the close button and auto-close-on-save silently did nothing.
- **`json-edit-react` for every JSON surface** (`json-view.tsx` / `json-panel.tsx` / `json-theme.ts`). Themed from the app's own CSS variables so it follows `.dark` with no JS. The panel owns a CAPPED ScrollArea: the cap must go on the ScrollArea's VIEWPORT, not the root — Base UI sizes the viewport `h-full` and that percentage does not resolve against a flex-derived height, which left the root correctly capped at 382px while the viewport stayed 11349px and the tree was clipped with no scrollbar at all.
- **All `hover:scale-*` replaced with `hover:-translate-y-px`** and both `backdrop-blur` usages removed. Scaling promotes an element to a composited layer and re-rasterises its text, which is the "blur on hover" that was reported. Verified 0 blurred elements and 0 `hover:scale` remaining.
- **Toast viewport moved to `z-100`.** It was `z-50`, identical to the dialog, so the later-mounted modal painted over it.
- Fixed a real Base UI accessibility error on the run detail page: the back button renders an anchor via `render={<Link>}` and needs `nativeButton={false}`.

## Task 4.4 Completion Notes (2026-09-01)

**Human decisions taken during this task (all reversed/refined mid-build, in this order):**
1. JSON-Schema validation → add `@cfworker/json-schema` (Zod cannot consume arbitrary JSON Schema, and the Agents UI accepts any pasted schema).
2. Synthesized schemas → **persist as System agents**, reusable by later runs.
3. Unverifiable fields → **publish flagged**, not dropped (Task 4.5 implements the flagging).
4. Model selection → started as a pinned id list, then **superseded**: model ids are NEVER hardcoded. Discovered from each provider's `/models`, ranked by advertised capability, cached in the DB.
5. **Every prompt lives in the database**, with Redis as the hot cache, invalidated on write.
6. System agents are **copy-on-write**: editing one forks a personal Human copy; the fork then supersedes the original in routing. **A user's own agents outrank System agents.**
7. JSON is rendered through `json-edit-react` **everywhere**, not `<pre>` dumps.

- **New tables** (`drizzle/0004_military_eternals.sql`, `0005_lame_sunfire.sql`, both additive `CREATE TABLE` only, applied to remote Turso): `model_catalog` (per-user provider catalog cache) and `prompts` (per-user editable pipeline prompts). Split into `src/lib/db/schema-pipeline.ts` and re-exported from `schema.ts`, which had crossed the 250-line cap; drizzle-kit still reports one 9-table schema. The `schema ⇄ schema-pipeline` cycle is safe because the FK reference is a lazy arrow — verified at runtime, not just by tsc.
- **`extract_ms` COLLIDED.** Ingest already wrote `extract_ms` (ffmpeg audio extraction) and `run-status.ts` assigned it to `downloading`. Since stage completion is derived from recorded timings, adding it to `extracting` too would have made ffmpeg's work show the agent stage as complete — the same false-green-tick bug fixed once in 4.2. Ingest's key is now `audio_extract_ms`; `extracting` owns `route_ms` + `extract_ms`.
- **Model ranking is capability-driven, with exactly two documented heuristics.** Groq publishes `supported_features` (`json_mode`, `structured_outputs`), `input/output_modalities`, `context_length`; OpenRouter publishes `supported_parameters` + `pricing`; **OpenAI publishes nothing beyond id/created/owned_by.** The heuristics are (a) an id regex excluding guard/embed/tts/moderation models, because `openai/gpt-oss-safeguard-20b` advertises *identical* capabilities to the general chat model, and (b) a parameter count parsed from the id. (b) exists because a `created`-desc tiebreak picked `gpt-oss-20b` over `gpt-oss-120b` (identical on every published figure, 20b is newer) and **20b failed schema validation twice, 13 then 11 errors, on a recipe that 120b extracts first-try**.
- **Groq's free tier is 8000 TPM and the transcript goes over the wire twice per run** (routing, then extraction). Back-to-back runs 429 routinely. Two mitigations: routing sees a 4000-char truncation (it only needs the clip's *kind*), and `runChat` waits out the provider's own advised delay once when every candidate is exhausted. NOTE: under sustained pressure the router still degrades to weaker models that fail schema validation — measured, a run fell through to `groq/compound-mini` and produced 3 fields instead of 4. **Worth considering: fall through to the next model when a model fails validation twice**, which the brief's "exactly one retry" wording did not cover.
- **Redis cache uses its OWN ioredis connection**, not the queue's. BullMQ's is `enableOfflineQueue: false` so a pre-handshake command throws (`Stream isn't writeable...`, measured on the first read in a fresh process). For a cache that trade is backwards; a briefly-buffered cache write is harmless. Namespaced `relay:cache:*`, separate from BullMQ's `{relay}`.
- **The evidence contract is structural, not requested.** Agent schemas embed a `oneOf` of a `transcript` and a `visual` evidence shape, discriminated by `kind` — so Task 4.3b adds a producer and a verifier branch, not a migration across stored agents. The synthesizer never writes JSON Schema itself: it proposes a field *plan* and `compile()` injects evidence on every field, because a model asked for JSON Schema will eventually emit one where evidence is optional, and that schema would then be persisted and reused.
- **New `Modal` shell** (`src/components/modal.tsx`): three-row grid (static header / scrolling ScrollArea body / static footer), sizes sm→full. Built because the agent editor's JSON Schema pushed its own Save button off-screen.
- **Verified in the running app** (agent-browser, dark + light, 1440×900 + 390×844): routing to the seeded Recipe agent (`route 17ms · extract 5.34s`, timeline stage lights up automatically); synthesizer inventing a "Bike Maintenance" agent for a non-recipe transcript and extracting against it first-try; copy-on-write producing `Recipe (my version)` as a Human row with the System original untouched; routing candidates confirming the fork ranks #1 **and removes the System Recipe from the list**; the Prompts dashboard saving, bumping to v2 and invalidating Redis; extraction rendering as content with expandable evidence quotes. Typecheck 0, biome clean on all 66 changed files, build succeeds, every authored file under 250 lines.
- **NOT verified:** a full end-to-end pipeline run through the worker. YouTube still rate-limits this machine, so extraction was exercised against the transcripts already stored on runs `ca63b6fd` and `f9651c15` (both now carry real `result.extraction`). `bun run lint` still fails repo-wide on pre-existing `useSortedClasses` violations in `landing-page.tsx`/`privacy`/`terms` — untouched by this task.
- **OpenRouter has NO key configured yet**, so every extraction ran on Groq. The OpenRouter provider entry, catalog normaliser and ranker are written and typecheck, but are **unexercised against a live OpenRouter key** — add one at /vault to activate that path.
- QA accounts (`qa-relay44@`, `qa-json@`) and the synthetic "Bike Maintenance" agent were removed afterwards.

## Queue UI + Deploy Notes (2026-09-01)

- **Run detail page** `/queue/[id]`: stage timeline, both transcript streams with ms-stamped segments, discarded-output panel for no-speech runs, source/processing facts, and the full `additional_data` blob. Prefetched server-side into `runKeys.detail(id)`, polls while the run is live and stops when terminal.
- **Stage completion is derived from EVIDENCE (recorded timings), not list position.** The first version showed green ticks on `extracting`/`publishing` for a finished run — stages that do not exist yet. They now render as "Not run".
- **Status badge**: the spinner slot is only rendered while active; an always-present slot made terminal labels sit right-of-centre inside their own pill. Column width is reserved on the table cell instead.
- **Links** resolve their icon in three tiers (`src/components/queue/link-icon.tsx`): media-source brand mark → bundled brand mark (12 platforms) → `config.links.faviconUrl` → generic glyph. Only the third tier touches the network, and it is the *browser* calling out, so `FAVICON_SERVICE_URL=""` disables it.
- **Dragonfly runs with `--cluster_mode=emulated --lock_on_hashtags`** and BullMQ uses the hash-tagged prefix `{relay}`. CORRECTION to an earlier note: this pairing is a **throughput** choice, not correctness — measured locally, an un-tagged prefix still works fine under emulated cluster mode on a single node. The tag pins a queue's keys to one Dragonfly thread.
- **Coolify (app `djtrhq2qxxyt1doyonjctwcb`, env `relay`)**: added `REDIS_URL=redis://dragonfly:6379`, `QUEUE_CONCURRENCY/ATTEMPTS/BACKOFF_MS`, `FAVICON_SERVICE_URL`. `STUDIO_PASSWORD` was already set, so dropping the `DRIZZLE_MASTERPASS` fallback from compose is safe (that var held the literal error string — a Coolify artifact).
- **The worker service builds from the Dockerfile rather than reusing a shared image tag.** Coolify rewrites every compose service's image to `<resource-uuid>_<service>:<sha>`, so a hand-pinned `relay-app:latest` shared between `relay` and `worker` would not exist at deploy time. CORRECTION (2026-09-01): the claim that "Docker's layer cache makes the second build nearly free" was **wrong**. Only `relay` was passing the `NEXT_PUBLIC_*` build args; those are baked into `ENV`, so the worker's build produced a different cache key from the ENV layer down and recompiled the entire Next.js app a second time. The worker service now passes the identical args — see the deployment notes below.
- **YouTube now rate-limits this dev machine** ("Sign in to confirm you're not a bot") after repeated pulls of the same clips. Not a code fault — it maps correctly to `SOURCE_UNAVAILABLE` — but it means the deferred cookie work applies to YouTube as well as Instagram.

## Task 4.3 Completion Notes (2026-09-01)

- **Provider registry** `src/lib/transcription/providers.ts` mirrors `src/server/ray-providers.ts`: the id catalog stays in `src/lib/providers.ts`, this file maps ids onto endpoints/models. Pipeline code never names a provider — `resolveProvider()` picks the first configured one in preference order (Groq first: far faster than OpenAI's whisper-1, and free).
- **Two streams (PRD §4.2)**: `/audio/transcriptions` (spoken language) and `/audio/translations` (English) run **concurrently**, both `verbose_json`, float seconds converted to integer ms. Roman/phonetic output comes from a chat transliteration pass in `roman.ts` — phonetic, never translating.
- **Whisper models**: `whisper-large-v3`, NOT `-turbo` — turbo is transcription-only and does not serve `/audio/translations`.
- **Groq's catalog churns.** `llama-3.3-70b-versatile` was configured and had already been withdrawn ("model does not exist"); there are now **no llama models on Groq at all**, and **no vision-capable models**. Current chat model: `openai/gpt-oss-120b`. Verify against `GET /openai/v1/models` before changing.
- **Free tier confirmed adequate**: Groq Whisper 20 RPM / 2,000 RPD / 28,800 audio-sec per day; chat 30 RPM / 14,400 RPD. One run ≈ 120 audio-seconds (two Whisper calls on the same clip) ⇒ ~240 clips/day free. OpenRouter cannot serve this stage at all — it has no audio transcription endpoint.
- **Gotchas found by testing against real clips:**
  1. **A Whisper decoding `prompt` was tried to force Latin script and removed.** It does not work (Hindi still returned Devanagari) and it *contaminates* output — a low-speech clip returned "The Latin ürlich", straight out of the prompt text.
  2. **Whisper fabricates speech on music-only audio** ("Thank you for watching!", "Sampai jumpa di channel ini!"). Since silent Reels are common, this would have fed invented content to the extraction agent — the exact failure this product exists to prevent. Gated on `no_speech_prob`; fabricated text is discarded but retained under `additional_data.no_speech.discarded_text` for auditing.
  3. **`avg_logprob` is NOT a usable speech signal** and briefly broke the gate: measured over whole clips it is *anti-correlated* — narrated Hindi averaged **-1.278** while music-only averaged **-0.708**, so the rule rejected real speech. Thresholds derived from a partial 6-segment sample were wrong; only `no_speech_prob` (0.107 vs 0.701) is gated on.
  4. Transliteration is done **line by line with a segment-count check**; a mismatched count returns the original rather than misaligning the timestamps Task 4.5 verifies against.
- **`hasSpeech: false` is a signal, not a throw** — transcription returns empty streams so the caller can fall back to the frame/vision layer (below). The pipeline throws `NoSpeechError` only because no fallback exists yet.
- **Verified end to end** against real clips under `abdulwadudh5@gmail.com`: narrated Hindi Short → `done` in 7.5s with correct Roman ("aaj main aap sabke saath chaay ki recipe share karne wali") and English ("Today I will share a very easy and tasty tea recipe. Take 2 cups of water, add 1 inch ginger…"), both ms-aligned; music-only Short → `failed` with `NO_SPEECH`, nothing fabricated. Typecheck 0, biome clean, build succeeds, all files under 250 lines.

## Planned: Task 4.3b — Frame/Vision Extraction (human decision 2026-09-01, AMENDS PRD §5)

**PRD §5 lists "Visual frame-by-frame OCR / computer vision analysis" as Strict Out of Scope. That is now amended.** Evidence: most Reels/Shorts are music over on-screen text, with *no speech and empty descriptions* (verified: two silent Shorts had descriptions of "" and a bare URL). For those clips audio and metadata both yield nothing, so frames are the only content source.

- **Approach**: ffmpeg samples keyframes (scene-change detection), a multimodal model reads on-screen text and what is visually happening.
- **Groq cannot do this** — its catalog has no vision models. **Gemini's free tier is the intended provider** (it also exposes an OpenAI-compatible endpoint, so it fits the existing registry shape); `gemini` is already in `AI_KEY_PROVIDERS`. Requires the user to add a Gemini key.
- **Evidence model gains two tiers, labelled (human decision):** transcript-derived fields keep the strong guarantee — a verbatim quote must appear in the transcript or the field is dropped. Frame-derived fields carry `{frame_timestamp, on_screen_text}` and are **explicitly marked as visual evidence** in the published output, because a model reading a frame is a weaker claim than a verbatim quote and must not be presented as equivalent.
- Narrated clips keep transcript grounding; only silent clips fall back to visual citations.

## Deferred: Social Cookie Credentials (human decision 2026-08-31)

Instagram refuses anonymous downloads, so Reels need a signed-in session passed to yt-dlp via `--cookies`. Decided approach and sequencing:

- **Build AFTER Task 4.6**, not now — the pipeline is the product; cookie capture only unlocks one extra source, and once 4.3–4.6 exist a captured cookie can be verified end-to-end instead of only proving the download step.
- **Capture method: server-side browser the user drives**, not a paste box and not a child window. Chromium runs on the server (**headful + Xvfb** — chosen over `--headless=new` because Instagram fingerprints headless aggressively); frames stream to a `<canvas>` via CDP `Page.startScreencast`, user input is relayed back through `Input.dispatchMouseEvent`/`dispatchKeyEvent`. The user types their password into Instagram's own page, so **Relay never stores a social password** and 2FA/CAPTCHA just work. Cookies are read from the browser's own jar (`Storage.getCookies`), serialized to Netscape format, and stored as a new credential `type: "cookie"`.
- **Why not an in-app child window** (asked and answered): `window.open` is cross-origin so the DOM is unreadable, `document.cookie` is origin-scoped, and Instagram's `sessionid` is `HttpOnly` so JavaScript cannot read it even same-origin. Every workable route goes through a privileged context — a browser extension (`chrome.cookies`) or a browser we own. There is no in-page route.
- **Bonus property**: a cookie minted from the server's IP is later used by yt-dlp from that same IP, avoiding the IP/device mismatch that gets pasted home-browser cookies flagged.
- **Known risks**: Instagram anti-automation on datacenter IPs (the main failure mode), ~400 MB image growth plus ~300–500 MB RAM per session, and the screencast WebSocket is a remote-control channel that must be authenticated, user-scoped, single-use and expiring. Note the password *transits* the server even though it is never stored.
- `credentials.type` is plain TEXT with no CHECK constraint, so adding `"cookie"` needs **no migration** — only the Drizzle enum and Zod schema.

## Task 4.2 Completion Notes (2026-08-31)

- **Schema**: new `relay_runs` (id, user_id FK cascade, source_url, source, agent_id, status enum, error, timings JSON, result JSON, `additional_data` JSON, timestamps; index on `(user_id, status)`), plus `additional_data` added to `credentials` and `agents` per human decision. Migration `drizzle/0003_perfect_redwing.sql` is additive-only (two `ADD COLUMN ... NOT NULL DEFAULT '{}'`), generated and applied against the remote Turso database.
- **Queue**: BullMQ 6.3.3 + ioredis 6 over Dragonfly. BullMQ v6 moved the Redis client to a **peer dependency**, so `ioredis` is a direct dependency now, not transitive.
- **`--default_lua_flags=allow-undeclared-keys` is MANDATORY on Dragonfly.** BullMQ's Lua scripts build key names at runtime (`args[1] .. jobId`); Dragonfly rejects that by default and *every* job fails on first enqueue with `script tried accessing undeclared key`. Set in docker-compose and documented in `src/config` and `.env.example`.
- **Architecture**: `POST /api/v1/relay/process` writes a `queued` row then enqueues, returning 202 — the request never waits on the pipeline. The row is created *before* the job so a job can never reference a missing row; if the enqueue itself fails the run is immediately marked `failed` with `ENQUEUE_FAILED` rather than sitting on `queued` forever. `relay_runs` is the source of truth, so a flushed Dragonfly loses scheduling, never history.
- **Worker** runs as its own process (`bun run worker`, `scripts/worker.ts`, `worker` service in compose reusing the `relay-app:latest` image). Permanent failures (`SOURCE_UNSUPPORTED`, `SOURCE_UNAVAILABLE`, missing binary) throw `UnrecoverableError` so BullMQ stops instead of burning the retry budget re-downloading nothing — verified: an unavailable video failed after 1 attempt, not 2.
- **`src/lib/run-status.ts`** holds the status vocabulary (labels, solid badge fills, terminal check) with only a *type* import from the schema, so client components can use it without pulling Drizzle into the browser bundle (`src/lib/runs.ts` opens the db and must never be imported client-side). `Record<RunStatus, …>` makes it exhaustive by type, so a new status can't silently drift.
- **UI**: `/queue` follows the established list pattern (server prefetch into `runKeys`, HydrationBoundary, skeleton mirroring the real chrome, loading/error/empty/refetch/stale states). Polling is a `refetchInterval` function that returns 2000 while any run is non-terminal and `false` otherwise — measured at **3 polls during an 8s active window, 0 polls in 12s idle**. Sidebar "Queue" un-flagged.
- **Gotchas found and fixed:**
  1. `TableCell` bakes in `whitespace-nowrap`, so the error message's `line-clamp-2` could never wrap — it clipped mid-word. Needs an explicit `whitespace-normal`.
  2. `pkill -f "start-server.js"` does **not** match this project's `bun --bun next start` process. Stale servers kept serving an old build while the "new" one silently failed to bind — which looked exactly like a broken route (`/queue` fell through to `[...catchAll]`, whose Title Case fallback even produced a convincing "Queue" heading). Kill by matching `next start` via PowerShell and confirm port 3000 is free before rebuilding.
- **Verification**: typecheck 0 errors; `biome check` clean on all changed paths; `bun run build` succeeds. Full round-trip in the running app with agent-browser (dark + light, 1440×900 + 390×844): empty state → invalid-URL inline rejection → submit → `Queued` badge + toast → polled to `Done` with title and 3.5s duration → unavailable URL → red `Failed` badge with wrapped message → delete with confirm → row gone and persisted. QA account and its runs were removed afterwards.
- **NOTE — `bun run lint` fails repo-wide** on pre-existing `useSortedClasses` violations in files this task never touched (`src/app/login/page.tsx`, `src/app/privacy/page.tsx`, landing page). Not introduced here; worth a separate formatting pass.
- **Local dev** needs Dragonfly: `docker run -d --name relay-dragonfly --ulimit memlock=-1 -p 6379:6379 docker.dragonflydb.io/dragonflydb/dragonfly:latest --default_lua_flags=allow-undeclared-keys`, then `bun run worker` alongside `bun run start`.

## Task 4 Human Decisions (2026-08-31)

- **Queue/workers:** BullMQ + Dragonfly (Redis) — runs are enqueued, never executed inside the HTTP request. Lands in Task 4.2.
- **`additional_data` JSON column** on all app-domain tables (`credentials`, `agents`, `relay_runs`) — NOT on Better Auth's `auth_*` tables, which Better Auth owns and would never populate.
- **Production is containerised** — anything the pipeline needs at runtime must be installed in the image, not assumed on the host.

## Task 4.1 Completion Notes (2026-08-31)

- **Source registry** `src/lib/media/sources.ts`: owns the supported-source vocabulary the way `providers.ts` owns credential providers. `parseSourceUrl()` accepts only Instagram Reel (`/reel/`, `/reels/`, `/<account>/reel/`) and YouTube Shorts (`/shorts/`) paths on those hosts, normalises `www.`/`m.`, rejects non-http(s), and returns a tracking-free `canonicalUrl` that is what gets handed to yt-dlp and stored on the run. `SUPPORTED_SOURCE_LABELS` derives all user-facing copy, so no pipeline code contains a source string literal.
- **Zod boundary**: `relayProcessSchema` in `src/lib/schemas.ts` refines the URL through `parseSourceUrl`, so adding a source never touches the schema.
- **Binary preflight** `src/lib/media/binaries.ts`: every run checks `yt-dlp`/`ffmpeg` before spawning and throws `MediaBinaryError` naming the install command and the override env var. Only *successful* detections are cached, so installing a binary on a running server takes effect without a restart.
- **Ingest** `src/lib/media/{ingest,download,errors}.ts`: `withIngestedAudio(input, consume)` is a scope function — it downloads into `data/tmp/run-<id>/`, hands the MP3 to the caller, and purges the directory in `finally`, so download failures, extraction failures and consumer failures all clean up. yt-dlp's ~500 KB info JSON is pruned to ~2.5 KB of analysable source metadata (title, description, channel, counts, tags, upload date) destined for `relay_runs.additional_data`; format tables, captions and expiring signed CDN URLs are dropped.
- **Config**: new `config.media` section (`YT_DLP_PATH`, `FFMPEG_PATH`, `MEDIA_TEMP_DIR`, and the mono 16 kHz 64 kbps MP3 target Whisper wants).
- **Dockerfile**: installs `ffmpeg` (Debian) and a pinned, arch-aware, self-contained `yt-dlp` build. Without this the containerised prod deploy would fail every run at preflight.
- **Gotchas found and fixed (all three were silent failures):**
  1. `ffmpeg` exits 8 on `--version` (it only accepts single-dash `-version`) after printing its banner, so a perfectly good ffmpeg read as "broken". The version flag is now per-binary.
  2. A newline inside a Bun `$` template is a **command separator**, not whitespace — multi-line commands silently ran the second line as its own command. All invocations are single-line with arguments passed as an array (each element becomes exactly one argv entry).
  3. Bun's `rm` shell builtin **silently no-ops on Windows when the path starts with `./`** — exit 0, empty stderr, directory untouched. Every run was leaking its media. The temp root strips the `./` prefix, and `purge()` now verifies the directory is actually gone instead of trusting the exit code.
- **Verification**: `bun run typecheck` 0 errors; `biome check` clean; `bun run build` succeeds; `import { $ } from "bun"` confirmed to build *and execute* inside a real Next.js production route handler (temporary probe route, reverted). Full ingest exercised on Windows and again inside the `oven/bun:1` container: real YouTube Short downloads/extracts/purges; unavailable, unsupported, consumer-throws and missing-binary paths all verified. **Instagram happy path is NOT verified** — yt-dlp cannot fetch Reels anonymously ("rate-limit reached or login required"), which correctly maps to `SOURCE_UNAVAILABLE`; publishing real Reels will need a cookies/session mechanism that is not in Task 4's scope.

## Task 3 Completion Notes (2026-08-31)

- **Agent service** `src/lib/agents.ts`: `listAgents`/`createAgent`/`updateAgent`/`deleteAgent`, masked to an `AgentSummary` shape (`isActive` coerced to boolean; the `is_active` column has no Drizzle boolean mode). Only `type: "human"` rows are creatable/mutable through this API — `update`/`delete` scope their WHERE clause to `type = "human"` so a future System agent (synthesized by Task 4's pipeline) can't be edited or removed from this UI.
- **API**: `GET/POST /api/v1/agents`, `PUT/DELETE /api/v1/agents/:id` (Zod-validated via `agentInputSchema`/`agentUpdateSchema` in `src/lib/schemas.ts`), mounted in `src/server/agents.ts` following the `credentialsModule` pattern.
- **UI**: `/agents` page — card grid (`agents-grid.tsx`/`agent-card.tsx`) instead of Vault's table, since agents carry richer content (prompt preview, JSON schema, active toggle) than a credential row. Shared create/edit dialog (`agent-form-dialog.tsx`) with a JSON-Schema `Textarea` (client-side `JSON.parse` validation with inline error, blocks submit on invalid JSON) and a live Active `Switch`. Added the ShadCN `Textarea` primitive (`bunx shadcn add textarea`) — didn't exist in the project yet. GSAP entrance stagger on cards per TRD's "GSAP micro-interactions" spec (`useGSAP` + `gsap.from`, scoped to the card ref) — the only page in the app using GSAP for chrome motion, everywhere else uses Tailwind `animate-in` utilities. Sidebar's "Agents" item un-flagged from `soon: true`.
- **Gotcha fixed**: `AgentCard`'s optimistic `isActive` state (`useState(agent.isActive)`) went stale after editing an agent through the form dialog — `router.refresh()` re-renders the Server Component tree with fresh props, but the already-mounted `AgentCard` client component doesn't reset its own `useState` just because a prop changed. Fixed with a `useEffect` that re-syncs local state from the `agent.isActive` prop.
- **QA (agent-browser)**: full create → toggle-active (persists across reload) → edit (including a deliberate invalid-JSON submit to confirm the inline error path) → delete round-trip verified in the running app, plus light mode and mobile viewport (390×844, single-column grid, dialog scrolls correctly).

## Task 2 Completion Notes (2026-08-29)

- **Vault service** `src/lib/vault.ts`: create/list/delete credentials + `getAccessToken`; single-tenant local user bootstrap (`users` row `local`). Refresh tokens stored self-contained as `ivHex:cipherB64` (GCM IVs must never be reused; TRD's single `iv` column serves the access token).
- **API**: `GET/POST /api/v1/credentials`, `DELETE /api/v1/credentials/:id` (Zod-validated, masked responses); `GET /api/v1/rays/oauth/notion` + `/callback` (state cookie CSRF, token exchange, encrypted persist, redirect to /vault with `?connected`/`?error`).
- **Config**: `config.notion` section (NOTION_CLIENT_ID/SECRET env vars).
- **UI**: fixed-viewport app shell (`src/components/app-shell.tsx`, root never scrolls — only ShellContent scrolls); `(dashboard)` route group; `/vault` page with credentials table, empty state, Add API Key dialog (ShadCN Field/Select/Input), delete confirmation, toasts; Connect Notion disabled with hint until Ray env is set. Built under design-taste-frontend + gpt-taste constraints; all authored files < 250 lines.
- **QA (agent-browser)**: add-key → encrypted row → delete round-trip verified in the running app; Select label bug and unconfigured-Notion UX fixed from findings.
- **Gotchas fixed**: user-added `NODE_ENV=development` in `.env.local` broke `next build` (removed — Next manages NODE_ENV); stale HMR global renamed to `__relayDrizzle`; Biome override for vendored `src/components/ui/**`.
- **Active Circuit Breakers:** See `RULES.md` (canonical) — max 3 files/step, `bun run typecheck` 0 errors, commit + STOP per task, no ghost dependencies, **Bun-first: Bun-native/Web-standard APIs only; `node:*` compat only where Bun ships no equivalent, with justifying comment; raw `bun:sqlite`, no ORM.**

## Task 1 Completion Notes (2026-08-29)

- **Scaffold:** `bunx --bun shadcn@latest init --preset b5pFrsf5Vq --template next --rtl --pointer` (mira style, zinc base, emerald theme, hugeicons, RTL, pointer). Project uses a `src/` directory layout per human instruction.
- **Toolchain (human-directed mid-task):** Biome replaces ESLint + Prettier (`bun run lint`, `bun run format`). `tsc --noEmit` retained solely for the typecheck gate (Biome does not type-check). All scripts run Next via `bun --bun` so `bun:sqlite` is available.
- **Theme:** Emerald-on-Zinc OKLCH variables in `src/app/globals.css`; dark mode default; Oxanium on `h1–h4` via `--font-heading`; Space Grotesk body; JetBrains Mono for `--font-mono`.
- **Database:** `src/lib/db/index.ts` — `bun:sqlite`, WAL, FK on; `users`, `credentials` (hybrid: AES-256-GCM `access_token`/`refresh_token` + plaintext `meta_data` JSON, indexed `expires_at` and `(user_id, provider)`), `agents` per TRD §2.
- **Crypto:** `src/lib/crypto.ts` — AES-256-GCM, unique 96-bit IV per record, auth tag appended to base64 ciphertext, key from `MASTER_ENCRYPTION_KEY` (generated into `.env.local`, gitignored).
- **Observability:** `src/lib/observability/logger.ts` (batched OpenObserve ingest + Hono middleware, console fallback when unconfigured), `src/lib/observability/client.ts` (RUM: page loads, errors, interactions), `/api/v1/telemetry` proxy keeps OpenObserve credentials server-side. Hono mounted at `src/app/api/v1/[[...route]]/route.ts` with `/api/v1/health`.
- **Dependencies added (required by Task 1 spec):** `hono`, `@types/bun` (dev), `@biomejs/biome` (dev). Removed: `eslint`, `eslint-config-next`, `prettier`, `prettier-plugin-tailwindcss`.
- **Verification:** `bun run typecheck` = 0 errors; `biome check` clean; `bun run build` succeeds; `bun scripts/smoke-test.ts` — tables/indexes created, crypto roundtrip OK, IV uniqueness OK, tamper detection OK.

## Post-Task-1 Amendments (2026-08-29, human-directed)

- **Drizzle ORM adopted** (reverses earlier no-ORM ruling): schema in `src/lib/db/schema.ts`, `drizzle-orm/bun-sqlite` driver, migrations in `drizzle/` via `bun run db:generate`, applied automatically on connection.
- **Zod validation** at all API boundaries; shared schemas in `src/lib/schemas.ts`.
- **`src/config/index.ts` is the single source of ALL configuration** — no `process.env` reads elsewhere. Vault key env var is `VAULT_KEY` (user-chosen name); DB URL from `DATABASE_URL` (default `file:./local.db`).
- **Brand assets** generated to `public/relay_x32.ico` + `public/relay_x512.webp` (ffmpeg) and wired via `config.assets` in layout metadata; no icon files in `src/app`.
- README rewritten with setup/scripts/layout documentation.

## Post-Task-2 Amendments (2026-08-31, human-directed)

- **Turso/libSQL adopted** (supersedes `drizzle-orm/bun-sqlite`): `src/lib/db/index.ts` now uses `drizzle-orm/libsql` + `@libsql/client`; `config.database.url`/`authToken` already supported this (`turso://` normalized to `libsql://`, `DATABASE_TOKEN` read) but the driver hadn't been switched over yet. Local dev can still use `file:./local.db` (no token); production points at a Turso `libsql://` URL.
- **Migrations no longer run automatically on connection.** libsql's `migrate()` is async but `getDb()` is called synchronously throughout the codebase (e.g. `vault.ts`), and auto-migrating per-connection let concurrent Next.js build workers race to migrate the same database (root cause of the Coolify build failures around commits `eb85f86`..`b7df1bb`: `drizzle-orm`'s sqlite migrator reads the "last applied migration" row before opening its transaction, so parallel workers could both decide a migration was pending and both apply it). Migrations are applied solely via the explicit `bun run db:migrate` step (Dockerfile CMD runs it before `next start`).
- **`drizzle.config.ts`** switched to `dialect: "turso"` with `dbCredentials: { url, authToken }`.
- **Better Auth drizzle adapter schema fix:** `src/lib/auth.ts`'s `authSchema` now aliases both the base model name and the configured `modelName` override to the same table (e.g. both `verification` and `auth_verifications` → `schema.authVerifications`) — the adapter's `getSchema(model)` looks up `schema[model]` where `model` is sometimes the base name and sometimes the override depending on the code path; only aliasing the base name caused a 500 on Google sign-in (`BetterAuthError: The model "auth_verifications" was not found in the schema object`).

## Docker / Coolify Deployment Notes (2026-09-01)

Coolify facts that shape the files: build pack is `dockercompose`, the target
is a **4-CPU arm64** host, `force_docker_cleanup` prunes daily (so the layer
cache is warm within a deploy, not across weeks), and Coolify rewrites every
service's image to `<resource-uuid>_<service>:<sha>` — which is why `relay`
and `worker` each build the Dockerfile instead of sharing a tag.

- **The `worker` service was recompiling the whole Next.js app on every
  deploy.** Only `relay` passed the `NEXT_PUBLIC_*` build args; those are
  baked into `ENV`, so from that layer down the worker's cache key differed
  and Docker rebuilt everything below it. Measured on the new Dockerfile: an
  arg change re-runs `bun run build` in **16.4s**, identical args make the
  whole build a **3s** cache hit. The worker service now passes the same
  args. On the old Dockerfile an arg change also re-ran `bun install`,
  because the ARG/ENV block sat above it — installation now comes first.
- **Three stages** (`deps` → `builder` → `runtime`). The builder has no media
  binaries (it never shells out) and the runtime never sees Bun's global
  install cache or `.next/cache`. Runtime contents are copied explicitly
  rather than with `COPY . .`, because one image runs three things needing
  different slices of the repo: `next start` (.next, next.config.ts, public),
  `db:migrate` (drizzle.config.ts, drizzle/, src/config) and
  `bun scripts/worker.ts` (scripts/, src/, tsconfig.json for `@/*`).
- **Size barely moved: 2003 MB → 1960 MB.** Bun hardlinks its install cache
  into `node_modules`, so dropping the cache reclaims almost nothing. The
  image is `node_modules` 1179 MB + `/usr` 721 MB. The remaining win is a
  `--production` install, worth ~165 MB (`@biomejs` alone is **131 MB**,
  `typescript` 23 MB) — NOT DONE, because `bun run db:migrate` shells out to
  `drizzle-kit`, a devDependency. Taking it means either moving drizzle-kit
  to `dependencies` or migrating through `drizzle-orm/libsql/migrator`
  instead, which changes the production migration path. A human call.
- **`oven/bun:1` had floated to 1.4.0** while local development is on 1.3.1 —
  production was running a different Bun minor than anything was tested on.
  Pinned to `1.3.1-slim`, and Dragonfly pinned to `v1.40.1` for the same
  reason (`:latest` is re-pulled on every deploy).
- **`init: true` on the worker only.** It is the only service that spawns
  children (yt-dlp, ffmpeg, instaloader); Bun as PID 1 does not reap orphaned
  grandchildren. Verified: `/proc/1/comm` is `docker-init`.
- **Worker liveness** `src/lib/queue/health.ts` — a loopback `Bun.serve` on
  `QUEUE_HEALTH_PORT` (3001) reporting `worker.isRunning()`. Without it Docker
  and Coolify can only see that the process exists, which stays true after
  BullMQ stops consuming. Never published; the container's healthcheck is the
  only caller.
- **`depends_on: relay` on the worker is a migration ordering constraint**,
  not a runtime one — `relay`'s CMD runs `db:migrate`, and a worker that
  picks up a job against an unmigrated schema fails it.
- **Not done, deliberately:** running as the non-root `bun` user would change
  the ownership expectations of the already-provisioned `relay_data` volume;
  and the relay healthcheck queries remote Turso every 30s (~2,880 queries a
  day) because `/api/v1/health` lists `sqlite_master`.
- **Verification**: both images built and diffed; new image booted end to end
  on a local network — `db:migrate` applied all 6 migrations into a fresh
  database and `/api/v1/health` returned all 9 tables; the worker connected to
  Dragonfly v1.40.1 and its health endpoint returned
  `{"status":"ok","queue":"relay-runs","concurrency":2}`; `yt-dlp 2026.03.17`,
  `instaloader 4.15.3`, `ffmpeg 5.1.9` and `bun 1.3.1` all present in the
  runtime image.

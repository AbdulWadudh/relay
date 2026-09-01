# Session Auth — Server-Side Cookie Capture for Social Sources

Design document. Status: **Phase 1, awaiting approval.** No implementation code exists yet.

Supersedes `LLM_STATE.md:129-138` ("Deferred: Social Cookie Credentials"), which is
restated and **corrected** where it no longer matches the code.

---

## 0. Why now, and what actually broke

The deferred note opens with "Instagram refuses anonymous downloads"
(`LLM_STATE.md:131`). **That premise is stale.** Since instaloader landed
(`LLM_STATE.md:9-16`), Instagram Reels download fine *anonymously* via
`src/lib/media/instaloader.ts:102`. The live problems are different:

1. **YouTube fails today — but NOT from the bot check, and cookies would not fix
   it.** Measured 2026-09-01 (§1.1): the bot check of `LLM_STATE.md:103` has
   decayed, and the live failure is `HTTP Error 403: Forbidden` on the *media*
   fetch after metadata resolves fine. **Half the sampled videos fail.** The fix
   is a yt-dlp `player_client` argument, not a session. This is a standalone
   production bug and it ships first (§7, Phase 0).
2. **Anonymous Instagram is fragile, not broken.** `LLM_STATE.md:15` calls the
   cookie work "the fallback for when it starts refusing". The code says the same
   thing in a comment at `src/lib/media/instaloader.ts:15-18`.

So this feature is **not** "unblock Instagram", and — corrected from the first
draft of this document — it is **not** "unblock YouTube" either. It is: *give
every source an optional per-user signed-in session, so a rate-limited source
degrades to "reconnect your account" instead of a dead end.* Capture is
**insurance against a failure mode that is currently dormant**, which is a
weaker justification than the first draft claimed, and §7 is re-ordered
accordingly: the cheap deterministic fixes land before the expensive one.

### Terminology

| Term | Meaning |
| --- | --- |
| **jar** | A Netscape-format cookie file, the thing `yt-dlp --cookies` consumes. |
| **capture session** | One live headful Chromium + Xvfb instance a user is driving. |
| **social credential** | A `credentials` row with `type: "cookie"` holding one jar. |

---

## 1. Downloader reality check

Two separate questions live here. **1.1** is YouTube's *current* failure and was
settled by measurement. **1.2** is the Instagram consolidation hypothesis and
remains blocked.

### 1.1 YouTube today — the GVS 403 — VERDICT: **SETTLED, and it is not a session problem**

Measured 2026-09-01 on yt-dlp `2026.03.17` (the exact version pinned at
`Dockerfile:78`), anonymous, no cookies. `-f bestaudio/best` is the pipeline's
literal format string (`src/lib/media/download.ts:90`).

| Video | default | `web_embedded` | `mweb` | `tv_simply` |
| --- | --- | --- | --- | --- |
| `dQw4w9WgXcQ` (music) | ❌ 403 *(×2)* | ✅ 3.4 MB | ✅ | ✅ |
| `9bZkp7q19f0` (music) | ❌ 403 | ✅ | – | – |
| `n5t23nvU_t0` (**Short**) | ❌ 403 | ✅ | ✅ | ✅ |
| `T-1iAFMZunY` (Short) | ✅ 591 KB | ✅ | – | – |
| `MGIovezvFSQ` (Short) | ✅ | – | – | – |
| `afZpm4LVjG0` (Short) | ✅ | – | – | – |

**Default client: 3 of 6 fail. `web_embedded`: 4 of 4 succeed, including every
video the default chain lost.** Metadata resolution always succeeded — only the
media fetch 403s:

```
$ yt-dlp --no-warnings -f bestaudio/best "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
[info] dQw4w9WgXcQ: Downloading 1 format(s): 251
ERROR: unable to download video data: HTTP Error 403: Forbidden
```

Four consequences, each independent of session capture:

1. **This is a live bug in the repo.** `src/lib/media/download.ts:84-100` builds
   its argv with **no `--extractor-args`**, so every YouTube run uses the default
   client chain. On this sample that is a coin flip.
2. **It is misclassified, and it burns the retry budget.** The `UNAVAILABLE`
   regex (`src/lib/media/download.ts:57-58`) matches
   `private|login|sign in|not available|unavailable|removed|does not exist|age.?restrict`
   — "HTTP Error 403: Forbidden" matches **none** of them, so it falls through to
   `DOWNLOAD_FAILED` (`:106`). `isPermanent` only promotes `SOURCE_UNSUPPORTED`
   and `SOURCE_UNAVAILABLE` (`src/lib/pipeline-errors.ts:34-38`), so BullMQ
   retries a **deterministic** failure through the full `attempts` budget
   (`src/config/index.ts:86`) plus backoff — the exact waste `LLM_STATE.md`
   records `UnrecoverableError` being introduced to prevent.
3. **Cookies would not have fixed this.** A GVS 403 is a
   SABR/PO-token-tier refusal, not an auth challenge. Had we shipped capture
   first and pointed it at YouTube, we would have built the expensive thing and
   watched it fail.
4. **The fix is a config-driven client fallback chain**, roughly the shape of the
   existing model fallthrough in extraction: try the default, and on a 403 retry
   down `config.media.youtubeClients` (default `["web_embedded", "mweb", "tv_simply"]`).
   `player_client` is per-invocation, so this is additive and reversible.

**One caution against over-fitting:** `tv` returned "The page needs to be
reloaded", `android_vr` resolved metadata then 403'd on media, and `ios` returned
"Requested format is not available". Which clients work is a moving target set by
YouTube, which is exactly why the list belongs in `src/config/index.ts` and not
in a source file.

### 1.1b PO Tokens — VERDICT: **not the answer; do not build**

yt-dlp already carries the framework — `-v` prints
`[debug] [youtube] [pot] PO Token Providers: none` — so a provider plugin would
slot in. It should still not be built now:

- **It does not solve our problem.** The provider's own README states: *"Providing
  a PO token does not guarantee bypassing 403 errors or bot checks, but it may
  help your traffic seem more legitimate."* Its PyPI page goes further —
  passing PO tokens *"no longer bypasses the bot check for majority of cases."*
  A client swap fixes our 403 outright, measured, at zero runtime cost.
- **It collides head-on with a binding rule.** `bgutil-ytdlp-pot-provider`
  requires **Node.js ≥20 or Deno ≥2.0**. `RULES.md:14` — "Never invoke Node, npm,
  npx, or Node-installed binaries." Adding it means a second language runtime in
  the image at the exact moment §1.2 Branch A is trying to remove the first
  (Python). Script mode is explicitly *"NOT recommended for high concurrency"*,
  and server mode is another always-on container on a one-VPS deploy (§5.1).
- **Keep it as a documented escalation**, to revisit only if the client fallback
  chain stops working. It is a genuine option, just not a cheap one.

**Also surfaced:** yt-dlp itself warns *"Your yt-dlp version (2026.03.17) is older
than 90 days"* — it is ~5.5 months stale against `Dockerfile:78`. For YouTube
specifically, whose extractors break and get fixed continuously, a hard pin with
no bump cadence is a slow-motion outage. See risk #8.

### 1.2 Instagram consolidation — VERDICT: **BLOCKED ON PROOF**

### The hypothesis

`src/lib/media/instaloader.ts` exists only because yt-dlp cannot fetch Reels
*anonymously*. If `yt-dlp --cookies` works with a real signed-in jar, both sources
collapse onto one downloader and Python leaves the image.

### Evidence gathered

**Reproduced the anonymous baseline** on this machine (yt-dlp `2026.03.17`,
the exact version pinned at `Dockerfile:78`), on the exact Reel `DauNJ7Hpwaa`
that `LLM_STATE.md:10` records as the original failure:

```
$ yt-dlp --no-warnings --simulate --print "%(id)s|%(title)s|%(duration)s" \
    "https://www.instagram.com/reel/DauNJ7Hpwaa/"

ERROR: [Instagram] DauNJ7Hpwaa: Requested content is not available, rate-limit
reached or login required. Use --cookies-from-browser or --cookies for the
authentication. See https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp
for how to manually pass cookies
```

Three things this establishes:

1. **yt-dlp ships a live Instagram extractor.** `yt-dlp --list-extractors` returns
   `Instagram`, `instagram:story`, `instagram:tag`, and
   `instagram:user (CURRENTLY BROKEN)`. The plain `Instagram` extractor — the one
   that serves `/reel/` URLs — is *not* flagged broken. Only the profile-listing
   extractor is.
2. **yt-dlp itself names cookies as the remedy.** The error string is not a
   generic 403; the extractor explicitly instructs the caller to pass `--cookies`.
   That is upstream asserting the authenticated path is the supported path.
3. **The failure is the exact one `LLM_STATE.md:10` recorded**, so nothing has
   silently changed under us.

**Counter-evidence that stops this being a verdict.** Open yt-dlp issues report
Reels failing *with* valid cookies in some cases — notably "Instagram sent an
empty media response" (yt-dlp#17074) and age/restriction edge cases (yt-dlp#13551).
So "cookies are required" is proven; "cookies are sufficient" is not.

**Why I could not finish the test.** Settling this needs a jar from a real
signed-in Instagram account. I attempted to enumerate local browser profiles to
see whether one already existed; the sandbox classifier denied filesystem access
to browser profile directories. I did not work around it. **No Instagram session
exists on the server side yet either — that is the very thing this document
designs.** Hence: blocked, and deliberately sequenced *after* capture works (§7).

### The exact experiment

Run this signed into Instagram in a desktop browser (substitute `firefox`,
`edge`, or `brave` for `chrome` as appropriate):

```bash
yt-dlp --cookies-from-browser chrome \
       --no-warnings --simulate \
       --print "%(id)s|%(title)s|%(duration)s|%(description).60s" \
       "https://www.instagram.com/reel/DauNJ7Hpwaa/"
```

**Pass:** prints `DauNJ7Hpwaa|<title>|<seconds>|<caption>`.
**Fail:** repeats the rate-limit/login error, or "empty media response".

A pass on that line is **necessary but not sufficient**. Two follow-ups are part
of the same experiment, because a naive `--simulate` check would hide both:

```bash
# (b) a real download, not just metadata resolution
yt-dlp --cookies-from-browser chrome --no-playlist -f bestaudio/best \
       -o "./itest/source.%(ext)s" --write-info-json \
       "https://www.instagram.com/reel/DauNJ7Hpwaa/"

# (c) does the info JSON carry what routing reads?
bun -e 'const i=await Bun.file("./itest/source.info.json").json();
        console.log({title:i.title, description:i.description?.slice(0,80),
                     duration:i.duration, channel:i.channel, uploader:i.uploader})'
```

Check (c) is the one that actually decides consolidation. Routing reads
`info.title` (`src/lib/pipeline-errors.ts:47-51`) and `info.description`
(`src/lib/pipeline-errors.ts:54-57`). Instagram posts have **no title field**, so
`src/lib/media/instaloader.ts:53-55` synthesizes one from the caption's first
line, and `LLM_STATE.md:14` records that this synthesized title "is what routing
reads". **If yt-dlp's Instagram extractor returns a null or junk `title`, agent
routing silently degrades on every Reel** — a regression that produces plausible
wrong output rather than an error, which is the worst failure mode this codebase
has. `mapInfo` would have to be ported onto yt-dlp's shape, not deleted.

### Branch A — yt-dlp-only works

Requires (a), (b) **and** (c) to pass.

- `src/lib/media/download.ts:66-74` loses the `if (source.source === "instagram")`
  dispatch; `download()` becomes a single call to `downloadWithYtDlp`.
- Delete `src/lib/media/instaloader.ts` (144 lines).
- Delete the `instaloader` spec at `src/lib/media/binaries.ts:61-72`. The
  `sources?: readonly string[]` field (`src/lib/media/binaries.ts:46`) and the
  source-scoped skip at `src/lib/media/binaries.ts:164` become dead — **keep
  them**, they are correct machinery and cost nothing.
- `Dockerfile:83` drops `python3 python3-pip`; `Dockerfile:79` drops
  `INSTALOADER_VERSION`; `Dockerfile:94-95` drops the `pip3 install`;
  `Dockerfile:97` drops `instaloader --version`. Restores the Python-free
  `oven/bun:1-slim` base that `LLM_STATE.md:12` records as the original
  deliberate choice.
- `config.media.instaloaderPath` (`src/config/index.ts:129`) and
  `INSTALOADER_PATH` (`.env.example:56`) are removed.
- **Storage is unaffected** — one jar format (Netscape), one consumer.

### Branch B — Instagram still needs instaloader

Any of (a)/(b)/(c) fails.

- Both downloaders stay. `download.ts` keeps its dispatch.
- **Two cookie formats, and they are not interchangeable.** yt-dlp consumes a
  Netscape jar via `--cookies`. instaloader does **not**: it consumes its own
  pickled session file via `--load-cookies` / `--sessionfile`, keyed to a
  username. Verify instaloader's current flags before building this branch —
  do not assume.
- **Decision if Branch B lands: store Netscape only, derive on demand.** Netscape
  is the interchange format (it is what CDP `Storage.getCookies` maps onto
  cleanly, and what yt-dlp wants). A tiny adapter materializes instaloader's form
  per run inside the run's temp dir, alongside the jar, and dies with it (§4).
  Storing two encrypted blobs per credential would double the secret surface and
  let the two drift out of sync — one canonical secret, one derived artifact.
- Python stays in the image. Consolidation is deferred, not cancelled — re-run
  the experiment whenever yt-dlp's Instagram extractor changes.

### Non-negotiable sequencing

**Removing instaloader is its own phase and lands after authenticated downloads
work (§7, Phase 6).** Never in the same change. The reason is concrete and
recorded: `LLM_STATE.md:21` — a stale worker produced "a correct-looking failure
with the *old* wording", and the diagnosis cost real time. Deleting the fallback
downloader in the same change that introduces cookies means a cookie bug and a
consolidation bug are indistinguishable.

---

## 2. Session capture flow

### 2.1 The one structural constraint that shapes everything

**Next.js App Router route handlers cannot upgrade to WebSocket.** The Hono app is
mounted through `hono/vercel`'s `handle()` (`src/app/api/v1/[[...route]]/route.ts:79-83`),
which returns a `Response` — there is no upgrade path. A screencast is a
long-lived bidirectional channel, and a live Chromium handle is long-lived
in-process state that a request-scoped handler cannot own.

Therefore **capture runs in its own Bun process**, exactly as the worker does
(`scripts/worker.ts`, the `worker` service at `docker-compose.yml:67`). The
precedent already exists in-repo: `src/lib/queue/health.ts:19` runs a `Bun.serve`
inside the worker process. Capture uses the same pattern with
`server.upgrade()` added.

This also makes the concurrency cap (§5) *enforceable*: an in-memory session `Map`
is only authoritative if exactly one process owns it.

### 2.2 End-to-end

```
/vault ── "Connect" on a social provider card
   │
   ▼
POST /api/v1/capture/:provider          (Next.js / Hono, authenticated)
   │  · resolves :provider through the capture registry
   │  · asks the capture service for a slot over loopback
   │  · mints a single-use ticket into Dragonfly (60s TTL)
   ▼  → 201 { sessionId, ticket, wsUrl, expiresAt }   |   503 if cap hit
   │
   ▼
Browser opens  wss://<capture host>/stream?ticket=…    (capture service)
   │  · ticket redeemed + DELETEd atomically; bound to (userId, sessionId)
   │  · capture service launches Chromium headful under Xvfb
   │  · CDP Page.startScreencast → JPEG frames → WS → <canvas>
   │  ← pointer/key events → CDP Input.dispatchMouseEvent / dispatchKeyEvent
   │
   ▼  user completes login on the provider's own page (2FA, CAPTCHA all work)
   │
   ▼
Capture service polls CDP Storage.getCookies for the registry's `sessionCookies`
   │  · when all present → emits { type: "ready", account: {…} } on the WS
   ▼
POST /api/v1/capture/:sessionId/finish   (Next.js / Hono, authenticated)
   │  · fetches the harvested jar from the capture service over loopback
   │  · createCredential({ type: "cookie", provider, accessToken: <jar> })
   │  · disposes the session
   ▼  → 201 { credential }   → UI invalidates credentialKeys.list()
```

### 2.3 Files

**New — capture service (own process):**

| File | Responsibility |
| --- | --- |
| `scripts/capture.ts` | Entrypoint, mirrors `scripts/worker.ts`. `bun run capture`. |
| `src/lib/capture/server.ts` | `Bun.serve` + `server.upgrade()`; ticket redemption; loopback control endpoints. |
| `src/lib/capture/cdp.ts` | Minimal CDP client over Bun's native `WebSocket` — id correlation, event subscription. **No npm dependency.** |
| `src/lib/capture/chromium.ts` | Launch/kill headful Chromium under Xvfb via `Bun.$`; per-session throwaway profile dir. |
| `src/lib/capture/session.ts` | Session registry: create/get/dispose, concurrency cap, hard TTL, idle timer, guaranteed teardown. |
| `src/lib/capture/screencast.ts` | `Page.startScreencast` → WS frames; `screencastFrameAck` backpressure; input relay. |
| `src/lib/capture/cookies.ts` | `Storage.getCookies` → Netscape serialization. |
| `src/lib/capture/providers.ts` | **The registry.** Per source: login URL, `sessionCookies`, `mapAccount`. |

**New — app side:**

| File | Responsibility |
| --- | --- |
| `src/server/capture.ts` | `captureModule` (Hono). Routes below. |
| `src/components/vault/connect-session-dialog.tsx` | Modal over `src/components/modal.tsx`. |
| `src/components/vault/session-canvas.tsx` | `<canvas>`, WS lifecycle, pointer/key handlers, TTL countdown. |
| `src/lib/query/capture.ts` | TanStack mutation hooks, matching `src/lib/query/credentials.ts`. |

**Touched:**

| File | Change |
| --- | --- |
| `src/app/api/v1/[[...route]]/route.ts` | `app.route("/capture", captureModule)` beside line 29-35. |
| `src/lib/providers.ts` | New `SOCIAL_PROVIDERS` list (§2.4); folded into `ALL_PROVIDERS` (line 132). |
| `src/lib/schemas.ts` | `captureStartSchema`, `captureInputSchema`; `type` enum at line 20 gains `"cookie"`. |
| `src/lib/db/schema.ts` | `type` enum at line 36 gains `"cookie"`. No migration (§3). |
| `src/config/index.ts` | New `capture` + `social` sections (§5.5). |
| `src/components/vault/add-connection-dialog.tsx` | Social provider cards alongside Ray cards. |
| `src/components/vault/credentials-row.tsx` | "Reconnect" row action for a stale social credential. |
| `package.json` | `"capture": "bun scripts/capture.ts"`. |
| `.env.example` | Matching entries (§5.5). |
| `Dockerfile`, `docker-compose.yml` | Chromium + Xvfb; `capture` service. **⚠ Stop-and-ask before touching.** |

### 2.4 Staying provider-generic

`RULES.md:57` requires flows to go through a registry with "no provider-specific
routes, cookies, or hardcoded provider strings in flow logic".
`src/lib/capture/providers.ts` is the exact analogue of
`src/server/ray-providers.ts:53`, including the `Partial<Record<…>>` shape so an
unimplemented source has no entry:

```ts
export interface CaptureProvider {
  name: SocialProviderId
  /** Where the capture browser lands. */
  loginUrl: string
  /** Session is complete once ALL of these are present in the jar. */
  sessionCookies: readonly string[]
  /** Cookie domains written into the jar. Everything else is discarded. */
  cookieDomains: readonly string[]
  /**
   * CONTRACT (RULES.md:58) — identical to RayProvider.mapMetaData: MUST return
   * the generic `account_*` keys. Provider vocabulary is mapped here and
   * nowhere else.
   */
  mapAccount: (cookies: CdpCookie[], probe: unknown) =>
    Record<string, unknown> & { account_id?: string; account_name?: string }
}
```

**The social provider vocabulary derives from `MEDIA_SOURCES`**
(`src/lib/media/sources.ts:30-50`), not a hand-written second list. A social
credential's `provider` **is** the media source id, so the download-time lookup
in §4 is `provider === parsed.source` with no mapping table. One source of truth;
adding a source stays a one-entry change (`src/lib/media/sources.ts:6-9`).

This closes a real gap in the deferred note. `LLM_STATE.md:138` says adding
`"cookie"` needs "only the Drizzle enum and Zod schema". **That is incomplete.**
`credentialInputSchema.provider` is `z.enum(PROVIDER_IDS)`
(`src/lib/schemas.ts:21`), and `PROVIDER_IDS` derives from
`ALL_PROVIDERS = [...AI_KEY_PROVIDERS, ...RAY_PROVIDERS]`
(`src/lib/providers.ts:132-141`). Neither list contains `instagram` or `youtube`,
so **a cookie credential cannot be stored today — `createCredential` would reject
it at the schema boundary.** A third provider list is required.

### 2.5 Routes

All under the existing `/api/v1` basePath (`src/app/api/v1/[[...route]]/route.ts:25`).
`:provider` is generic, resolved through the registry — mirroring
`raysModule.get("/:provider")` (`src/server/rays.ts:28`).

| Method | Path | Behaviour |
| --- | --- | --- |
| `POST` | `/capture/:provider` | 401 no session · 404 unknown provider · 409 credential already exists (use Reconnect) · 503 + `Retry-After` cap hit · 201 `{ sessionId, ticket, wsUrl, expiresAt }` |
| `GET` | `/capture/:sessionId` | Poll status: `pending` / `ready` / `expired`. Lets the UI recover if the WS drops. |
| `POST` | `/capture/:sessionId/finish` | Harvest → `createCredential` → dispose. 409 if not `ready`. |
| `DELETE` | `/capture/:sessionId` | User cancelled. Disposes immediately. |

WebSocket lives on the capture service, not here: `GET <captureUrl>/stream?ticket=…`.

---

## 3. Storage model

### 3.1 Column mapping

Against `src/lib/db/schema.ts:29-58`:

| Column | Holds | Notes |
| --- | --- | --- |
| `type` (`:36`) | `"cookie"` | New Drizzle enum member alongside `"api_key"`, `"oauth"`. |
| `provider` (`:37`) | `"instagram"` / `"youtube"` | The `MediaSourceId` (`src/lib/media/sources.ts:52`). |
| `access_token` (`:38`) | **The entire Netscape jar, as one string**, AES-256-GCM encrypted. | The vault already treats this as an opaque secret — `encrypt()` at `src/lib/vault.ts:75`, ciphertext at `:119`, IV at `:123`. No new crypto. |
| `refresh_token` (`:39`) | `NULL` | A social session has no refresh grant. Re-auth is a full recapture. |
| `expires_at` (`:40`) | Earliest expiry among the registry's `sessionCookies`, ms. | See §3.2. |
| `meta_data` (`:43-45`) | **Plaintext.** Generic `account_*` keys only, plus `cookie_names` and `captured_at`. | §3.3. |
| `iv` (`:46`) | Per-record GCM IV. | Unchanged. |
| `additional_data` (`:47-50`) | Staleness bookkeeping: `last_verified_at`, `last_rejected_at`, `reject_count`, `browser_version`. | Not exposed by the API — `MASKED_COLUMNS` (`src/lib/vault.ts:29-37`) omits it. |

### 3.2 What `expires_at` means for a social session

It is **a floor on uselessness, not a promise of validity.** A social session can
be revoked server-side — password change, "log out all devices", an
anti-automation checkpoint — long before the cookie's own expiry. So:

- `expires_at` past ⇒ the jar is *definitely* dead. Cheap to detect without
  decrypting, and the column is already indexed
  (`idx_credentials_expires_at`, `src/lib/db/schema.ts:56`), so a
  "sessions expiring soon" sweep is a single indexed scan.
- `expires_at` future ⇒ the jar *might* be alive. Only a download settles it (§4).

The UI must therefore never render "valid until X". It renders "Connected as
@handle" plus, when `reject_count` has tripped, "Reconnect".

### 3.3 What must never enter `meta_data`

`meta_data` is plaintext on disk (`src/lib/db/schema.ts:41-42`) **and is returned
by the API** — it is in `MASKED_COLUMNS` (`src/lib/vault.ts:33`) and ships to the
browser via `GET /credentials` (`src/server/credentials.ts:23`). So:

- **No cookie value, ever.** Not `sessionid`, not `SID`, not a truncated prefix.
- Cookie **names** are fine (`cookie_names: ["sessionid", "ds_user_id", "csrftoken"]`)
  and are useful for diagnosing a partial capture without decrypting anything.
- Nice property: `isSensitiveKey` splits camelCase and `_` segments and matches
  `"cookie"` (`src/lib/observability/logger.ts:143`, `:152-161`), so a meta key
  named `cookie_names` is **auto-redacted** if `meta_data` is ever logged.
  Defence in depth, not the primary control.

### 3.4 Reconnect works with no new code

`createCredential` already replaces on `(userId, provider, meta.account_id)` for
every non-`api_key` type (`src/lib/vault.ts:87-110`). `type: "cookie"` falls into
the `else if` at `src/lib/vault.ts:99`, so **reconnecting the same Instagram
account updates in place** and connecting a second account creates a second row.
That is exactly the desired behaviour, inherited free.

### 3.5 Migration: **NONE**

Proven against the schema and the generated SQL:

- `src/lib/db/schema.ts:36` is `text("type", { enum: [...] })`. Drizzle's
  `enum` on a SQLite text column is a **TypeScript-level** constraint.
- The generated DDL confirms it: `drizzle/0000_jittery_stardust.sql:71` is
  ``  `type` text NOT NULL,  `` — plain TEXT, **no CHECK constraint**.
  `grep -in check drizzle/*.sql` returns nothing.

So adding `"cookie"` changes types only. `LLM_STATE.md:138` is correct on this
point (though incomplete on the provider list — §2.4).

**Also worth recording:** `TRD.md:27` specifies `CHECK(type IN ('api_key','ray'))`.
Neither the CHECK nor the value `'ray'` was ever built — the code has always used
`["api_key", "oauth"]`. The TRD is stale here; the schema is the truth.

**Phase-2 proof step:** after editing the enum, `bun run db:generate` must produce
**no new migration file**. If it does, stop — something else changed.

### 3.6 One vault function needs widening

`getAccessToken(provider, userId)` (`src/lib/vault.ts:218-231`) filters on
`(userId, provider)` with **no `type` filter and no ordering**, then takes
`.get()`. Harmless today because each provider has one row. It becomes ambiguous
the moment two credential types share a provider id. Add a sibling rather than
changing the existing signature:

```ts
export async function getSecretByType(
  provider: string, userId: string, type: "api_key" | "oauth" | "cookie",
): Promise<{ secret: string; credentialId: string; metaData: … } | null>
```

The `credentialId` is required so §4 can write the reject counter back.

---

## 4. Consumption at download time

### 4.1 Threading the user through

The downloader has no idea who it is downloading for. `withIngestedAudio` takes
`{ url, runId }` (`src/lib/media/ingest.ts:151-154`) and `src/lib/pipeline.ts:51`
passes exactly that — **no `userId`**. Minimal change:

- `src/lib/pipeline.ts:51` → `withIngestedAudio({ url, runId, userId: run.userId }, …)`.
  `run.userId` is already loaded (`getRunForWorker`, `src/lib/pipeline.ts:30`).
- `src/lib/media/ingest.ts:151` gains `userId: string` on the input type;
  `ingest()` (`:95`) forwards it to `download()` (`src/lib/media/download.ts:66`).

### 4.2 Materialize and destroy — `src/lib/media/cookies.ts` (new)

```ts
withSourceCookies(source, userId, dir, async (cookiesPath: string | null) => …)
```

- Looks up a `type: "cookie"` credential where `provider === source.source`.
- **None found ⇒ yields `null`, and the downloader omits `--cookies` entirely.**
  Behaviour is byte-for-byte today's anonymous path. This is what makes every
  phase in §7 independently shippable and instantly revertible.
- Found ⇒ decrypts, writes `${dir}/cookies.txt`, `chmod 600`, yields the path,
  and **deletes it in a `finally`**.
- The jar lives **inside the run's temp dir**, so `purge()` at
  `src/lib/media/ingest.ts:174-176` is a second line of defence: even a skipped
  inner `finally` (hard kill mid-run) still gets the jar removed with the
  directory. That `purge()` already verifies deletion rather than trusting the
  exit code (`src/lib/media/ingest.ts:134-144`) — a Windows `rm` bug made that
  necessary once, and it pays off again here.
- `--cookies` is a **read-write** flag: yt-dlp dumps the refreshed jar back to the
  file on exit. **Read it back before deleting and re-encrypt if it changed** —
  this is how a session stays alive across weeks instead of expiring on its
  original cookie lifetime. Never log the diff, only `rotated: true`.

### 4.2b YouTube's cookie rules are stricter than Instagram's

yt-dlp's own wiki imposes constraints that the deferred design did not account
for, and they change the capture flow:

- **A YouTube session must never be reopened in a browser after export.** The
  documented procedure is: private window → log in → navigate to
  `youtube.com/robots.txt` → export → **close the window immediately**, so that
  "the session is never opened in the browser again". Reopening rotates the
  refresh token and invalidates the exported jar.
  **Design consequence:** the capture profile dir is **single-use** — destroyed
  on dispose (§5.1) and never reused for a second harvest. Our throwaway-profile
  model already satisfies this, but it must be an explicit invariant rather than
  an accident, and the registry needs a per-provider
  `settleUrl` (`youtube.com/robots.txt`) visited immediately before harvest.
- **Concurrent use of one jar forks the rotation chain.** Two runs downloading
  with the same jar simultaneously both write back on exit (§4.2), and the loser
  clobbers the winner — potentially invalidating a live session.
  **Design consequence:** the per-user serialization in §5.4 is a **correctness**
  requirement for cookie-bearing runs, not merely fairness. Stated again there.
- **Using a real account carries ban risk.** The wiki is blunt: *"By using your
  account with yt-dlp, you run the risk of it being banned (temporarily or
  permanently),"* and recommends a throwaway account. We cannot enforce that —
  it is the user's account by design (per-user BYO session) — so the Connect
  dialog must say it plainly, next to the password-transit disclosure (risk #3).

None of this applies to Instagram, which is why it lives in the per-provider
registry (§2.4) rather than in flow logic.

### 4.3 Distinguishing a dead session from a dead video

Today every login-shaped failure collapses into one code. `UNAVAILABLE` at
`src/lib/media/download.ts:57-58` matches `/private|login|sign in|…/` and maps to
`SOURCE_UNAVAILABLE` (`:106`); `src/lib/media/instaloader.ts:21-22` does the same
with `/login|401|429|rate.?limit|checkpoint|challenge/`. The user-facing message
(`src/lib/media/download.ts:108`) even says "or require a signed-in session" —
useless advice once they *have* connected one.

**New rule, and it hinges on one bit of state:**

> If a jar **was supplied** and the failure is login-shaped, it is **not**
> `SOURCE_UNAVAILABLE`. It is `SESSION_EXPIRED`.

Concretely:

- `IngestErrorCode` (`src/lib/media/errors.ts:7-11`) gains `"SESSION_EXPIRED"`.
- Both downloaders take a `hadCookies: boolean` and branch on it when
  `UNAVAILABLE.test(stderr)` is true.
- The message is **ours, never stderr**: *"Your Instagram session has expired.
  Reconnect it in the Vault to keep processing Reels."* This also sidesteps a leak
  vector — `lastLine()` (`src/lib/media/errors.ts:29-32`) puts up to 400 chars of
  raw stderr into `run.error`, which is user-visible; a tool that ever echoed a
  cookie into stderr would land it in the run record. `SESSION_EXPIRED` never
  carries stderr.
- **Permanent.** Add to `isPermanent` (`src/lib/pipeline-errors.ts:32-44`)
  alongside `SOURCE_UNSUPPORTED` / `SOURCE_UNAVAILABLE`, so BullMQ raises
  `UnrecoverableError` instead of burning the retry budget on a jar that is dead
  in exactly the same way twice.
- **Side effect:** increment `additional_data.reject_count` and set
  `last_rejected_at` on the credential. At
  `reject_count >= config.social.staleAfterRejects` (default 2) the Vault row
  renders "Reconnect" as a **row-scoped action** — `RULES.md:60` puts operations
  on an existing record in that record's row, not the page header.
- Two rejects, not one, because a single transient checkpoint should not nag a
  user whose session is actually fine. A success resets the counter and sets
  `last_verified_at`.

### 4.4 Logging

No jar, cookie value, or file path content is ever logged. Permitted fields:
`source`, `credential_id`, `cookie_count`, `rotated`, `session_state`. Checked
against `SENSITIVE_WORDS` (`src/lib/observability/logger.ts:139-150`) — note the
middleware logs **both** request *and* response bodies
(`src/lib/observability/logger.ts:198`, `:215`), so the capture routes must never
put jar material in either. `POST /finish` returns the masked credential only.

---

## 5. Scaling to many users

### 5.1 Capture-time cost and the hard cap

Deploy target is one VPS (`docker-compose.yml:26-27` calls this out explicitly).
Standing cost today: Next.js + worker + Dragonfly + Drizzle Gateway ≈ 1.0–1.4 GB.
Headful Chromium + Xvfb is ~300–500 MB **per live session** (`LLM_STATE.md:137`).

| Setting | Value | Reasoning |
| --- | --- | --- |
| `capture.maxConcurrent` | **2** | On a 4 GB box, ~2.7 GB is free after the standing set. 2 × 500 MB = 1 GB leaves ~1.7 GB of headroom for a concurrent download + ffmpeg burst. 3 would fit on paper and lose the headroom; ffmpeg and a 25 MB download are exactly what spikes at an unpredictable moment. **Drop to 1 on a 2 GB box** — it is one env var. |
| `capture.sessionTtlMs` | **600 000** (10 min) | Hard ceiling. 2FA means fetching a code from a phone; 5 min is genuinely tight for that. Past 10 min the user has walked away. |
| `capture.idleTimeoutMs` | **90 000** (90 s) | The real reclaimer. An abandoned tab must not hold 500 MB for the full TTL. Resets on any inbound input frame. 90 s survives reading a 2FA SMS; 30 s would kill live sessions. |
| `capture.ticketTtlMs` | **60 000** (60 s) | Ticket→WS handshake is machine-speed. 60 s absorbs a slow page load with no meaningful replay window. |

**When the cap is hit** the user sees, immediately and honestly: `503` with
`Retry-After: 60`, and a toast — *"Another sign-in is in progress. Try again in a
minute."* The Connect button disables and re-enables on the retry window.
**Deliberately no wait-queue** (MVP-first, `RULES.md:11`): a queue for a
2-slot resource that is used once per user per account is machinery without a
customer, and a spinner that might resolve in 10 minutes is worse UX than an
honest "try again".

**Guaranteed teardown** — every path, because a leaked Chromium is 500 MB that
never comes back:

1. **Normal** — `/finish` or `DELETE` disposes.
2. **WS close/error** — `ws.close` handler disposes. Covers tab close, refresh,
   network drop.
3. **Idle timer** — 90 s without input.
4. **Hard TTL timer** — 10 min, unconditional, survives a wedged idle timer.
5. **Process exit** — `SIGTERM`/`SIGINT` handler disposes all, mirroring
   `installShutdownHandlers` (`src/lib/queue/worker.ts:64-75`).
6. **Backstop sweep** — every 60 s, kill any Chromium PID whose session is gone
   from the registry, and delete orphaned profile dirs. This is the one that
   catches the bug we have not thought of.
7. **Container** — `init: true` on the capture service. Bun as PID 1 does not
   reap orphaned grandchildren; `docker-compose.yml:80-83` already learned this
   for the worker, and Chromium spawns a *tree*.

### 5.2 The screencast WebSocket is a remote-control channel

Whoever holds this socket is typing into a browser that is about to hold the
user's social session. It is the most dangerous surface in the design.

- **Authentication — ticket, not cookie.** `POST /capture/:provider` mints a
  `crypto.randomUUID()` ticket into Dragonfly at
  `relay:capture:ticket:<uuid>` → `{ userId, sessionId }` with a 60 s TTL.
  Browsers cannot set headers on a `WebSocket` constructor, so a bearer token is
  not available; a query-string ticket that is single-use and 60-second-lived is
  the correct shape. Reusing the app session cookie would make the socket
  CSRF-reachable from any origin.
- **Single-use.** Redemption is `GETDEL` — atomic. A replayed ticket finds
  nothing and the socket is closed with `4401`.
- **User-scoped.** The redeemed `userId` must equal the session's owning
  `userId`, re-checked on the capture side. A valid ticket for *your* session
  cannot be pointed at *mine*.
- **Origin-checked.** Reject any upgrade whose `Origin` is not
  `config.app.baseUrl`.
- **Expiring.** The socket is force-closed at `sessionTtlMs` regardless of
  activity, and on idle timeout.
- **Input is Zod-validated per message.** `RULES.md:31-32` requires Zod on all
  external input at the API boundary; a WebSocket frame is external input.
  `captureInputSchema` bounds `type` to a fixed enum and clamps `x`/`y` to the
  configured viewport, so a malformed frame cannot be handed to CDP raw.
- **Navigation is fenced.** The capture browser may only be on a domain in the
  registry's `cookieDomains`. If the page navigates elsewhere, stop the
  screencast and end the session — otherwise the channel is an open SSRF-shaped
  proxy into the VPS's network from an authenticated user's keyboard.
- **Never logged.** No frame payload, no key event. Only lifecycle:
  `session_started`, `session_ready`, `session_disposed`, with a reason.

### 5.3 Run-time: per-credential rate budget

One user hammering their own Instagram account from a datacenter IP is the
fastest way to get *their* account flagged. `LLM_STATE.md:137` names this the
main failure mode.

| Setting | Value | Reasoning |
| --- | --- | --- |
| `social.ratePerHour` | **10** | A token bucket in Dragonfly keyed on the **credential id**, not the user — the account is what gets flagged. Each yt-dlp fetch is several requests; anonymous Instagram tolerates on the order of low-hundreds of requests/hour before throttling. 10 downloads/hour keeps us roughly an order of magnitude under, and is well within what a human browsing Reels generates. |
| `social.ratePerDay` | **50** | Guards the slow burn a per-hour cap misses (10/hr × 24 = 240/day would look nothing like a human). 50/day is far more than a curator saves, so it should never bind in practice — it exists to catch a runaway loop. |
| `social.staleAfterRejects` | **2** | §4.3. |

Over budget ⇒ the job is **delayed, not failed**: `job.moveToDelayed(nextRefill)`.
A rate limit is a "later", not a "never", and `relay_runs` keeps the row honest at
`queued`.

### 5.4 Run-time: per-user fairness in BullMQ

Today concurrency is **one global number** — `config.queue.concurrency` default 2
(`src/config/index.ts:85`), passed straight to the Worker
(`src/lib/queue/worker.ts:26`). Nothing is per-user. One user submitting 20 URLs
occupies both slots until they are done, and every other user waits. With a
measured 303.5 s extraction on a single run (`LLM_STATE.md:26-27`), that is a
~100-minute head-of-line block from one submission burst.

**`queue.perUserConcurrency = 1`.** A user may have at most one run *executing*;
with a global 2, two different users always make progress.

**This is also a correctness requirement, not only fairness** (§4.2b): two
concurrent runs sharing one jar both write the rotated cookies back on exit, and
the loser's clobber can invalidate a live YouTube session. Serializing per user
serializes per credential, since a credential belongs to exactly one user. If
`perUserConcurrency` is ever raised above 1, the semaphore key must move from
`userId` to `credentialId` for cookie-bearing runs — noted here so the coupling
is not rediscovered the hard way.

Implementation: BullMQ OSS has no job groups (that is BullMQ Pro), and `limiter`
is global, not per-key. So a Dragonfly semaphore at the top of `processRun`
(`src/lib/pipeline.ts:29`):

- `SET relay:userslot:<userId> <runId> NX PX <ttl>` — acquired ⇒ proceed,
  released in a `finally`.
- Not acquired ⇒ `job.moveToDelayed(now + config.queue.deferMs)` (2 s) and
  return. The slot is not held, so nothing deadlocks.
- The `PX` TTL is the crash-safety net: a worker killed mid-run releases the slot
  by expiry rather than wedging that user forever. TTL must exceed the longest
  plausible run — default **1 800 000** (30 min), sized off the 328.7 s worst case
  observed at `LLM_STATE.md:27` with a wide margin.

### 5.5 Where the numbers live

`src/config/index.ts` **only** — `RULES.md:22-24`, "never read `process.env`
anywhere else".

```ts
capture: {
  chromiumPath:   process.env.CHROMIUM_PATH ?? "chromium",
  xvfbRunPath:    process.env.XVFB_RUN_PATH ?? "xvfb-run",
  port:           Number(process.env.CAPTURE_PORT ?? 3002),
  publicUrl:      process.env.CAPTURE_PUBLIC_URL ?? "",
  maxConcurrent:  Number(process.env.CAPTURE_MAX_CONCURRENT ?? 2),
  sessionTtlMs:   Number(process.env.CAPTURE_SESSION_TTL_MS ?? 600_000),
  idleTimeoutMs:  Number(process.env.CAPTURE_IDLE_TIMEOUT_MS ?? 90_000),
  ticketTtlMs:    Number(process.env.CAPTURE_TICKET_TTL_MS ?? 60_000),
  viewport: { width: 1280, height: 800 },
  frame:    { format: "jpeg", quality: 60 },
},
social: {
  ratePerHour:        Number(process.env.SOCIAL_RATE_PER_HOUR ?? 10),
  ratePerDay:         Number(process.env.SOCIAL_RATE_PER_DAY ?? 50),
  staleAfterRejects:  Number(process.env.SOCIAL_STALE_AFTER_REJECTS ?? 2),
},
// added to the existing media section (src/config/index.ts:121-143) — Phase 0
media: {
  // Ordered yt-dlp `player_client` fallbacks tried when the default chain
  // returns 403 on the media fetch (§1.1). Which clients work is set by
  // YouTube and changes without notice, so this is an env var, not code.
  youtubeClients: (process.env.YT_DLP_YOUTUBE_CLIENTS ??
    "web_embedded,mweb,tv_simply").split(",").map((c) => c.trim()).filter(Boolean),
},
// added to the existing queue section (src/config/index.ts:58-95)
queue: {
  perUserConcurrency: Number(process.env.QUEUE_PER_USER_CONCURRENCY ?? 1),
  userSlotTtlMs:      Number(process.env.QUEUE_USER_SLOT_TTL_MS ?? 1_800_000),
  deferMs:            Number(process.env.QUEUE_DEFER_MS ?? 2000),
},
```

Matching `.env.example` entries go in a new `# --- Session capture ---` block
after the media section (`.env.example:47-62`), each with the one-line reasoning
above — that file already carries its rationale inline.

**No fixed frame rate is configured, on purpose.** `Page.startScreencast`'s
`screencastFrameAck` is the backpressure mechanism: the next frame is requested
only after the client acknowledges the last, so the stream self-throttles to the
slowest link instead of us guessing an fps. At quality 60 / 1280 px wide a frame
is ~60–100 KB; a login flow is near-static, so steady-state bandwidth is low and
only spikes on scroll.

### 5.6 What breaks first, at each tier

| Tier | First thing to break | Cheapest next step |
| --- | --- | --- |
| **10 users** | **Nothing structural — throughput, not memory.** Capture at 2 slots is rarely contended (a user connects once, then the jar lasts weeks). The pinch is the global concurrency of 2 against a 303.5 s extraction (`LLM_STATE.md:26-27`). | Two one-liners already identified and unrelated to this feature: move Groq ahead of OpenRouter in `EXTRACTION_ORDER` (`LLM_STATE.md:30`, `:58` — ~5 s vs 74–88 s), then raise `QUEUE_CONCURRENCY` to 4. |
| **100 users** | **The shared egress IP, well before RAM.** ~100 distinct social sessions all presenting from one datacenter IP is a correlation signal no per-credential rate budget can hide — §5.3 protects an account from *its own* burst, not from its neighbours. Secondarily: `data/tmp` (`src/config/index.ts:133`) under concurrent downloads. | Per-user egress proxying for social fetches (the highest-value change by far), plus a second worker container — the worker is already a standalone process (`scripts/worker.ts`, `docker-compose.yml:67`) so this is a compose edit, not a refactor. Add a disk-usage guard on `data/tmp`. |
| **1000 users** | **The single VPS, decisively.** Capture at 2 slots becomes a queue people wait in; Turso write contention on `relay_runs` (`src/lib/db/schema.ts:105`) under concurrent status updates; one IP is definitively flagged. | Split capture into its own scale-to-zero service (already a separate process, so this is a deployment change); a residential/mobile proxy pool with per-user stickiness; multiple worker nodes. At this point per-user fairness must move from a Dragonfly semaphore to real queue partitioning — BullMQ Pro groups or a queue-per-shard. |

---

## 6. Risks and open questions

1. **Instagram anti-automation on datacenter IPs — the main failure mode**
   (`LLM_STATE.md:137`). Headful + Xvfb was chosen over `--headless=new` precisely
   because Instagram fingerprints headless aggressively (`LLM_STATE.md:134`).
   Residual risk: CDP attachment is itself a known detection vector
   (`Runtime.enable` probing), and Chromium-over-CDP is what scrapers use, so it
   is what anti-bot vendors target. **Unmitigated by design choice; must be
   measured, not argued.** Phase 2's exit criterion is a real login completing —
   if Instagram checkpoints the capture browser, we learn it there, cheaply,
   before anything depends on it. Partial mitigation (`LLM_STATE.md:136`): the
   cookie is minted from the server's IP and used from the same IP, avoiding the
   home-browser/datacenter mismatch that flags pasted cookies.
2. **Image size.** Chromium + Xvfb is ~400 MB (`LLM_STATE.md:137`), roughly
   doubling the image. **Open question: does the capture service need its own
   Dockerfile stage?** Only the capture process needs Chromium — the `relay` and
   `worker` services would carry 400 MB they never execute. A separate final
   stage keeps them slim at the cost of a second build target. Recommend
   measuring the shared-cache cost first; `LLM_STATE.md`'s Docker notes record
   that a plausible-sounding cache assumption was already wrong once.
3. **The user's password transits the server.** They type it into Instagram's own
   page, relayed keystroke-by-keystroke through our WebSocket and CDP
   `Input.dispatchKeyEvent`. **Relay never stores it** (`LLM_STATE.md:134`), and
   §5.2 forbids logging key events — but it is in the capture process's memory in
   transit, and a compromised capture service could harvest it. This is inherent
   to the approach and cannot be engineered away; the alternatives were evaluated
   and rejected because `sessionid` is `HttpOnly` (`LLM_STATE.md:135`). **It must
   be stated plainly in the Connect dialog UI**, not buried in a privacy page.
4. **`CAPTURE_PUBLIC_URL` needs a Coolify routing decision.** The WebSocket
   cannot be proxied through Next.js (§2.1), so the capture service needs its own
   reachable host/path with WS upgrade allowed. Today only `relay` is exposed
   (`docker-compose.yml:14-15`). **Open question for the deploy step.**
5. **Chromium needs shared memory.** The default 64 MB `/dev/shm` crashes
   Chromium tabs. `shm_size: 1gb` on the capture service, or `--disable-dev-shm-usage`
   (which trades stability for disk I/O). Prefer `shm_size`.
6. **Branch B doubles the secret surface.** If instaloader stays, its session
   format is derived per-run rather than stored (§1.2) — but that adapter is
   unwritten and unverified. Do not commit to Branch B's shape until (a)/(b)/(c)
   have actually failed.
7. **A jar is a bearer credential for a whole social account** — strictly more
   dangerous than an API key, which is scoped and revocable per-integration. It is
   encrypted at rest exactly like every other secret (`src/lib/vault.ts:75`), so
   the marginal risk is blast radius, not storage. Worth an explicit line in the
   UI: disconnecting in Relay does **not** log the session out on the platform;
   the user should also "log out all devices" there if they want it truly dead.
8. **The yt-dlp pin is ~5.5 months stale and has no bump cadence.**
   `Dockerfile:78` pins `2026.03.17`; yt-dlp itself now warns the version is
   "older than 90 days". The pin exists for a good reason — `Dockerfile:66-68`
   wants reproducible extraction across deploys — but YouTube breaks extractors
   continuously, and §1.1's 403 is plausibly *partly* a staleness artefact.
   **Open question:** adopt a monthly pin bump with the §1.1 client matrix
   re-run as the acceptance test. Do not switch to a floating tag; that trades a
   predictable problem for an unpredictable one.
9. **The `player_client` fallback list is a moving target.** §1.1 measured which
   clients work *today*. YouTube changes this without notice, and `tv` /
   `android_vr` / `ios` already behave differently from what yt-dlp's own PO
   Token Guide implies. Mitigation is structural, not clever: the list lives in
   `src/config/index.ts` so it is an env-var change, never a redeploy of logic,
   and the fallback iterates rather than hardcoding one client.

---

## 7. Phased build plan

Each phase is independently shippable, independently verifiable, and revertible
without touching the ones before it. Every phase must end with
`bun run typecheck` clean, `bun run lint` clean, `bun run build` succeeding —
and **the worker restarted before any pipeline test** (`LLM_STATE.md:21`).

| # | Phase | Ships | Verified by | Gate |
| --- | --- | --- | --- | --- |
| **0** | **YouTube 403 fix** *(new — see §1.1)* | `config.media.youtubeClients`; a `player_client` fallback loop in `downloadWithYtDlp`; `403\|forbidden` added to the `UNAVAILABLE` regex **only** as a last-resort classification after every client has failed, so it stops being a retried `DOWNLOAD_FAILED`. | Re-run the §1.1 matrix: all 6 videos download, including the 3 the default chain loses. Restart the worker, then a real Short completes end-to-end. | **None. Ships first, alone.** Independent of everything below. |
| **1** | **Storage + vocabulary** | `"cookie"` in the Drizzle enum and Zod schema; `SOCIAL_PROVIDERS` derived from `MEDIA_SOURCES`; `getSecretByType`; Vault renders a (non-functional) social card. | `bun run db:generate` produces **no migration**. A hand-inserted cookie row round-trips through `GET /credentials` masked, with no jar material in the response. | — |
| **2** | **Capture service, one provider end to end** | `scripts/capture.ts`, CDP client, Chromium+Xvfb launcher, screencast, input relay, ticket auth, cap/TTL/teardown, the Connect dialog. Docker changes. | **A real human login completes** and the jar is harvested. This is where risk #1 gets answered. | ⚠ Stop-and-ask: `Dockerfile`, `docker-compose.yml`. |
| **3** | **Authenticated downloads** | `withSourceCookies`; `userId` threaded through ingest; `--cookies` on the yt-dlp path; per-provider `settleUrl` + single-use profile (§4.2b). | A real Short **and** a real Reel download with a captured jar. Note: after Phase 0 both already work anonymously, so the assertion is "cookies do not regress it" plus a forced-bot-check test if one can be provoked. | Needs 1+2. |
| **4** | **Session lifecycle** | `SESSION_EXPIRED`; permanent classification; reject counter; "Reconnect" row action; jar rotation write-back. | Deliberately corrupt a stored jar → run fails `SESSION_EXPIRED` (not `SOURCE_UNAVAILABLE`), one attempt not two, row offers Reconnect. | Needs 3. |
| **5** | **Fairness + budgets** | Per-credential token bucket; per-user semaphore with `moveToDelayed`; config + `.env.example`. | Two users × 5 runs interleave instead of serializing. 11th download in an hour delays rather than fails. | Independent of 6. |
| **6** | **Consolidation decision** | Run §1.2's experiment (a)/(b)/(c) with a **real captured jar**. Then Branch A or Branch B. | Branch A: an Instagram Reel completes end-to-end on yt-dlp with a correct non-empty `title`, Python gone, image shrinks. Branch B: documented, instaloader stays. | **Gated on §1.2 proof. Must land after Phase 3.** ⚠ Stop-and-ask: deleting `instaloader.ts`, `Dockerfile`. |

**Why Phase 6 is last.** It is the only phase that *removes* a working code path.
Phases 1–5 are purely additive — with no cookie credential stored,
`withSourceCookies` yields `null` and every source behaves exactly as it does
today (§4.2). That means each of 1–5 can ship and be reverted independently, and
a bug in cookies can never be confused with a bug in consolidation.

---

## Appendix: corrections to the deferred design

| Claim | Location | Status |
| --- | --- | --- |
| "Instagram refuses anonymous downloads, so Reels need a signed-in session" | `LLM_STATE.md:131` | **Stale.** Reels download anonymously via instaloader (`src/lib/media/instaloader.ts:102`). YouTube is the blocked source (`LLM_STATE.md:103`). |
| "adding `"cookie"` needs no migration" | `LLM_STATE.md:138` | **Correct.** `drizzle/0000_jittery_stardust.sql:71` is plain TEXT, no CHECK. |
| "only the Drizzle enum and Zod schema" | `LLM_STATE.md:138` | **Incomplete.** Also needs a provider-catalog entry — `credentialInputSchema.provider` is `z.enum(PROVIDER_IDS)` (`src/lib/schemas.ts:21`), derived from `ALL_PROVIDERS` (`src/lib/providers.ts:132`), which has no social ids. §2.4. |
| `credentials.type` vocabulary is `('api_key','ray')` | `TRD.md:27` | **Stale.** Always been `["api_key","oauth"]` (`src/lib/db/schema.ts:36`); the CHECK was never generated. |
| Cookies stored as `type: "cookie"`, Netscape, from `Storage.getCookies` | `LLM_STATE.md:134` | **Adopted unchanged.** §3. |
| Headful + Xvfb over `--headless=new`; CDP screencast; input relay | `LLM_STATE.md:134` | **Adopted unchanged.** Firefox was evaluated (2026-09-01) and rejected: it has no CDP, and WebDriver BiDi has no screencast command — only `browsingContext.captureScreenshot`. Puppeteer lists `page.screencast()` as unsupported over BiDi. Firefox covers cookies and input but would require building the frame stream from screenshot-polling or ffmpeg X11 capture. |
| Screencast WS must be "authenticated, user-scoped, single-use and expiring" | `LLM_STATE.md:137` | **Adopted and specified.** §5.2. Added: it cannot live in Next.js at all (§2.1). |
| "the deferred cookie work applies to YouTube as well as Instagram" | `LLM_STATE.md:103` | **Superseded by measurement.** The bot check has decayed; YouTube's live failure is a GVS `403` that cookies do not address. Fixed by `player_client` (§1.1, Phase 0). Cookies remain the answer if the bot check *returns*. |
| PO tokens as a YouTube remedy | user question, 2026-09-01 | **Investigated and rejected for now.** Provider README: PO tokens "do not guarantee bypassing 403 errors or bot checks". Requires Node.js ≥20 or Deno, colliding with `RULES.md:14`. §1.1b. |

### Corrections to this document's own first draft

| First-draft claim | Correction |
| --- | --- |
| "YouTube is the source that is actually blocked today" (§0) | Wrong cause. It fails, but from a GVS 403, not the bot check. §1.1. |
| "authenticated YouTube is the phase that pays for itself immediately" (§0) | Wrong. Cookies do not fix a 403. Phase 0 does, for far less. §7. |
| Phase 3 verified by "a dev machine already rate-limited" | The rate limit has decayed; that control no longer exists. Verification restated in §7. |

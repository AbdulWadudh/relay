# Relay production runbook

**What the running system is made of, what each piece needs, and what to
check when something stops.**

Generic by design — no hostnames, keys, UUIDs or domains. Those belong in
Coolify and in your own SSH config. Placeholders below are written
`<like-this>`.

---

## 1. What is running

Four containers. All four must be healthy for a YouTube run to complete.

| container | what it is | if it stops |
| --- | --- | --- |
| `relay` | Next.js app — UI and `/api/v1`. Runs `db:migrate` on start. | No UI, no API, no new runs accepted |
| `worker` | BullMQ consumer. **Runs the entire pipeline.** | Runs are accepted but sit in `queued` forever |
| `dragonfly` | Redis-compatible queue backend, and the live run-log window | Nothing is picked up; no live logs |
| `warp` | Cloudflare WARP, SOCKS5 on `1080` | **Every YouTube run fails** |

```bash
ssh <prod-host>
sudo docker ps --format "{{.Names}} | {{.Status}}"
```

All four are services in `docker-compose.yml` and deploy together. `warp`
used to be a separate Coolify resource that had to be attached to the app's
network by hand; as of 2026-09-03 it is not — see §3.

### External services it depends on

| service | used for | failure mode |
| --- | --- | --- |
| Turso (libSQL) | all persistent data | runs fail at the first write |
| Notion (user OAuth) | publishing | fails at `publishing`; transcript and extraction already done |
| Whisper-class API (user key) | transcription | fails at `transcribing` |
| LLM API (user key) | routing, extraction, verification | fails at `extracting` |
| Cloudflare WARP | YouTube egress | see §3 |
| OpenObserve | logs, and run logs older than the live window | logs missing; runs unaffected. **Its read path is currently 401 — see §4.4** |

Every third-party key is the **user's own**, decrypted per run from the
vault with `VAULT_KEY` and held only for the duration of the call.

---

## 2. The pipeline

One BullMQ job per run, executed by `worker` in `src/lib/pipeline.ts`. The
stage names are also the run's `status` values and what the UI rail shows.

```
queued -> downloading -> transcribing -> extracting -> publishing -> done
                                                                  \-> failed
```

| stage | does | needs |
| --- | --- | --- |
| `downloading` | yt-dlp fetches audio into the run's temp dir; ffmpeg converts to 16 kHz mono mp3 | the egress proxy for YouTube; the user's cookie jar if one is connected |
| `transcribing` | Whisper: verbatim text transliterated to Latin script, plus an aligned English translation | transcription key |
| `extracting` | routes to an agent, extracts structured fields, verifies evidence quotes against the transcript | LLM key |
| `publishing` | document tree -> Notion blocks -> page in the user's database | Notion OAuth |

Each stage records its own timings on the run, and the UI derives stage
completion from **recorded timings** rather than position in the list — so
a stage that never ran reads as "not run" instead of showing a false tick.

Temp media lives in the run's own directory and is purged when the run
ends. A connected cookie jar is written there, `chmod 600`, for exactly one
download, then deleted.

---

## 3. YouTube egress — the part most likely to break

YouTube refuses **datacenter** addresses, and this deploy is a VPS. Without
a proxy every YouTube fetch returns "Sign in to confirm you're not a bot".

```
worker --socks5://warp:1080--> warp --WireGuard--> Cloudflare --> YouTube
```

| piece | where it lives |
| --- | --- |
| `MEDIA_PROXY_URL` | Coolify env var on the app = `socks5://warp:1080`; compose defaults to the same value |
| the proxy | the `warp` service in `docker-compose.yml`, image pinned |
| which sources use it | `proxied` flag in `src/lib/media/sources.ts` |
| where it is applied | `src/lib/media/download.ts`, as `--proxy` |

`warp` is **not** in the worker's `depends_on`, deliberately. Only YouTube
uses the proxy, so gating the worker on the tunnel would stop Instagram
ingestion whenever WARP is unhealthy. A YouTube fetch with the proxy down
fails `DOWNLOAD_FAILED` instead, which the queue retries on its own.

**Only YouTube is proxied.** Instagram has no `proxied` flag and goes
direct — it works direct and authenticates with the user's own cookie jar,
so routing it through a third party would add risk for nothing.

**No authentication.** Free WARP self-enrols and generates its own device
identity, so there is no secret to manage here. If the exit address is ever
blocked, delete `/var/lib/cloudflare-warp/` inside that container and
restart — it re-enrols with a fresh address.

### There is no manual step — and there used to be

`warp` is a compose service, so Compose attaches it to the app's own network
and gives it the bare service name as an alias. That is the whole reason
`socks5://warp:1080` resolves, and there is nothing to run after a deploy.

It was previously a **standalone Coolify resource**, which Coolify puts on
its shared network while the app sits on its own. They cannot see each other
by default, and `--network` in *Custom Docker Run Options* is silently
dropped by Coolify — so it only ever worked because somebody had run
`docker network connect --alias warp` by hand, and **every redeploy of the
proxy silently undid that**, stopping YouTube ingestion until it was run
again. A leftover `warp-egress` resource in Coolify is that old one: nothing
references it any more and it can be stopped.

Verify resolution from the container that actually downloads:

```bash
sudo docker exec $(sudo docker ps -qf name=worker) getent hosts warp
# expect an address; nothing now means the app's network is wrong, not that
# a manual attach is missing
```

Do **not** solve a networking problem here by putting the app on Coolify's
shared network instead: Dragonfly runs with no password, and that would
expose the job queue to every other container on the host.

### Is the tunnel actually up

The `warp` healthcheck proves the TUNNEL, not the port. It makes a real
request through the SOCKS listener and requires Cloudflare to confirm the
traffic arrived over WARP, so a listening `gost` with WARP disconnected
reads as **unhealthy** — which is exactly the state that fails every
YouTube run.

```bash
sudo docker ps --filter name=warp --format "{{.Names}} | {{.Status}}"
# expect (healthy). The same probe by hand:
W=$(sudo docker ps -qf name=warp)
sudo docker exec "$W" curl -s --socks5-hostname 127.0.0.1:1080 https://cloudflare.com/cdn-cgi/trace | grep -E '^(ip|warp)='
# expect warp=on
```

### Rollback

Set `MEDIA_PROXY_URL` to empty and redeploy. `download.ts` omits `--proxy`
when it is empty, so every fetch goes direct — no code revert needed. The
`warp` container keeps running harmlessly.

Because the pipeline reads a **URL**, switching to a Zero Trust plan or a
commercial residential proxy is that one variable and no code change.

---

## 4. Triage

### 4.1 Read the run's own logs first

The run detail page has a collapsible log stream under each stage. Expand
**Downloading** — it carries yt-dlp's own output. Usually faster than
anything else here.

Three limits, before you trust an empty panel:

- The live window is in Dragonfly with a TTL, and **a deploy restarts
  Dragonfly**, so logs from before the last deploy are gone.
- Older runs fall back to OpenObserve, which holds `info` and above — the
  yt-dlp `debug` lines are missing from history.
- **The OpenObserve fallback is currently BROKEN (measured 2026-09-03).**
  See §4.4. Until it is fixed, a run older than the live window shows "No
  logs retained for this stage" for every stage, whatever it actually did.

### 4.2 Match the message

| message | means | check |
| --- | --- | --- |
| "outbound proxy is unavailable" | our egress is down | §3 — is `warp` healthy |
| "challenging this server as automated traffic" | traffic went **direct** — the proxy was not used | `MEDIA_PROXY_URL` non-empty; `proxied` set for the source |
| "no client offered a downloadable audio format" | usually a **stale yt-dlp** | §5 |
| "refused this server with HTTP 403" | CDN refusal | §5 first |
| "Your … session has expired" | a supplied cookie jar was rejected | Vault. Only fires when a jar was actually sent |
| stuck on `queued` | worker down, or enqueue failed | §1 |
| fails at `transcribing` / `extracting` | user's API key invalid, out of credit, or rate-limited | Vault |

### 4.3 Error classification

`src/lib/media/classify.ts` maps a failure onto a ladder, and **the order is
load-bearing** — several of these messages overlap textually, so the wrong
order reports the wrong cause. The patterns themselves, each with the
measurement that justifies it, are in `src/lib/media/failure-patterns.ts`.

| order | condition | resolves to | why it sits here |
| --- | --- | --- | --- |
| 1 | proxy unreachable, **on an attempt that actually used the proxy** | `DOWNLOAD_FAILED` (retryable) | The SOCKS layer reports a refused tunnel as a `403` in some yt-dlp versions. Read as a client 403 it classifies **permanent**, so a brief proxy restart would fail every overlapping run for good |
| 2 | `403` | `SOURCE_UNAVAILABLE` | Means the same with or without a jar, so it must never read as an expired session |
| 3 | bot check | `DOWNLOAD_FAILED` (retryable) | A jar cannot answer a challenge aimed at the server's address; counting it against the credential would retire a working session. Retryable since 2026-09-04 — a challenge is aimed at an ADDRESS, and addresses stop being flagged, so classifying it permanent contradicted the message it showed the user |
| 4 | no matching format | `SOURCE_UNAVAILABLE` | Its text contains "not available", so without this it falls into the login branch and — with a jar present — reports as an expired session |
| 5 | login-shaped | `SESSION_EXPIRED` **only if that attempt sent a jar**, else `SOURCE_UNAVAILABLE` | The one case that genuinely means "your session died" |

Only `SESSION_EXPIRED` counts against a credential, and a completed
download is the only thing that clears its reject counter. Both conditional
rungs are decided on the **attempt being classified**, not on the run — a
failure cannot report an expired session unless the attempt it came from
actually supplied a jar and was refused anyway.

**The ladder is applied to every attempt, and the highest rung wins.** A
YouTube fetch walks the default client and then each `YT_DLP_YOUTUBE_CLIENTS`
entry, and they do not fail in order of usefulness: the default returning
`403` (the diagnosis, rung 2) followed by a later client returning
"Requested format is not available" (rung 4, which says nothing) is the
measured production shape. Until 2026-09-03 only the LAST stderr was kept,
so that run was reported as an extractor problem and §5 — bump the yt-dlp
pin, the actual fix — was never reached.

Equal-ranked attempts keep the earliest, which is the default client. The
`Download failed` log line records `cause` and `deciding_client`, so which
attempt produced the verdict can be read back without reproducing the run.

### 4.4 The OpenObserve read path returns 401

Measured 2026-09-03 against `OPENOBSERVE_URL` with the exact credential the
app is configured with (verified identical to the Coolify env var):

| endpoint | result |
| --- | --- |
| `GET /healthz` | `200 {"status":"ok"}` — the service is up |
| `POST /api/<org>/relay_server/_json` (ingest) | `200`, `successful: 1` — **writes land** |
| `POST /api/<org>/_search` (the history read) | **`401 Unauthorized Access`** |
| `GET /api/<org>/streams` | `401` |
| `GET /api/_meta/organizations` | `401` |

Not a wrong endpoint — `_search?type=logs` and `/api/v2/<org>/_search` are
401 too, and so is every other authenticated read. The credential in
`OPENOBSERVE_TOKEN` is accepted for INGEST and rejected for QUERY, so the
logs are being stored and cannot be read back.

`readRunLogsHistory` degrades to `[]` on any non-OK response, by design, so
this failure is invisible in the product: it looks exactly like a run that
produced no logs.

To fix: give `OPENOBSERVE_TOKEN` a credential with query rights — it is
currently `Basic base64(<user>:<password>)` for the root user, so either the
password is stale or that user lacks query permission on the org. Nothing in
the application code needs to change; `run-logs-history.ts` is issuing the
right request.

### 4.5 What is deliberately NOT shipped to OpenObserve

`src/lib/observability/skip-paths.ts` drops some request logs before the
OpenObserve sink. stdout and the log file still carry every line, so local
debugging is unchanged — the point is to stop paying durable storage for
traffic that answers no question.

| dropped | why |
| --- | --- |
| `/api/v1/health` | Docker's healthcheck, every 30s forever. 2,880 lines a day per container that say nothing `docker ps` does not, and are only read when the container is already known to be unhealthy |
| `/api/v1/telemetry` | Its request body IS the browser's log/RUM payload, which the OpenObserve browser SDK already ships to `relay_client`. A second copy of something already stored, up to 8KB a time |
| static assets (`.png`, `.css`, `.woff2`, …) | Next's proxy matcher only excludes `_next/static`, `_next/image` and `favicon.ico`, so the logo on every page render was being kept for 30 days |
| the BODY of `GET /api/v1/runs/:id/logs` | Its response is the run's log lines, the UI polls it every 2s while a run is live, and bodies are traced up to 8KB — so watching one run re-ingested the log store into itself. Status and duration are still recorded |

Two layers log requests and both apply the list: `src/proxy.ts` (Next's
proxy) and `openObserveMiddleware` (Hono). **`src/proxy.ts` is the one that
matters** — it posts once per request with no batching, where the pino
stream buffers 50 lines or 2 seconds.

Not currently excluded, and worth considering if volume is still a problem:
the proxy layer records a line for EVERY API request that the Hono
middleware then records again, adding only `user_agent` and `request_id`.
Dropping `/api/` from the proxy layer would roughly halve the request
volume.

---

## 5. yt-dlp

Pinned by `YT_DLP_VERSION` in the `Dockerfile`. It is the single most
fragile dependency — YouTube changes its streaming layer continuously, and
a stale pin shows up as widespread `403` on the media fetch: metadata
resolves, then the CDN refuses the stream.

**When a `403` is widespread, A/B the version before diagnosing anything
else.** One download, and it is decisive:

```bash
yt-dlp -f bestaudio/best -o t.%(ext)s "<url>"    # the pinned version
# then the same command with the latest release
```

Before changing the pin:

```bash
YT_DLP_PATH=/path/to/candidate bun run verify:ytdlp
```

That downloads real media for each fixture through the configured client
chain and fails if any fixture is unreachable. yt-dlp warns once a build is
over 90 days old — treat that warning as the trigger.

`YT_DLP_YOUTUBE_CLIENTS` is the fallback chain, tried after the default
client on a client-shaped failure. It costs nothing when nothing fails;
keep it, because which clients YouTube serves changes without notice.

Python is deliberately **not** in the image. ffmpeg is.

---

## 6. Secrets

- Every provider key and cookie jar is encrypted at rest with `VAULT_KEY`
  and decrypted per call. A jar exists on disk for one download only.
- **`MEDIA_PROXY_URL` is treated as a credential** — it may legitimately be
  `socks5://user:pass@host`, and yt-dlp echoes the proxy it was handed when
  it cannot reach it. `scrubProxy` strips it at the single point stderr
  enters the program, because that stderr reaches the user-visible
  `run.error`.
- `proxy` is in the logger's redaction words; `proxied` is not — the
  boolean is the useful half of the diagnostic without the half that could
  hold a secret.
- Run-log fields are redacted in the log tee, because those lines are
  rendered in the product.
- `bun run verify:proxy` pushes a canary password through real yt-dlp
  failure shapes and a log record; expect 0 leaks. Run it after touching
  `scrubProxy` or the redaction list.
- **Never add `--no-check-certificates`.** With TLS through the tunnel the
  proxy operator sees only opaque traffic while validation is on.
- **Never give the proxy resource a domain.** Coolify offers one from the
  server wildcard; `gost -L :1080` serves HTTP as well as SOCKS5, so a
  public route would be an open proxy.
- Keep host addresses, key names and resource UUIDs **out of this repo** —
  it is public.

---

## 7. Deploy

Auto-deploy is on. **Pushing to `main` deploys.** Do not also trigger a
deploy — the webhook can take more than 90 s to show new containers, and
triggering manually queues a redundant build.

```bash
git push origin main                   # this is the deploy
sudo docker ps --format "{{.Image}}"   # the tag carries the commit sha
```

- Coolify rewrites service image tags to `<resource>_<service>:<sha>`, so
  the running tag tells you exactly which commit is live.
- Compose services keep their bare service name as a network alias — this
  is why `redis://dragonfly:6379` and `socks5://warp:1080` resolve.
- **A deploy restarts Dragonfly**, wiping the live run-log window.
- Docs-only and graph-only commits still trigger a full rebuild.

### Where things live

| file | owns |
| --- | --- |
| `Dockerfile` | the yt-dlp pin, ffmpeg |
| `docker-compose.yml` | `relay`, `worker`, `dragonfly`, `warp`, the shared env block |
| `src/config/index.ts` | every env var, with its reasoning |
| `src/lib/media/sources.ts` | source registry — hosts, URL patterns, `proxied` |
| `src/lib/media/download.ts` | the fallback walk and what it concludes |
| `src/lib/media/ytdlp.ts` | one yt-dlp invocation, and `scrubProxy` |
| `src/lib/media/classify.ts` | the error ladder, and which attempt it is applied to |
| `src/lib/media/failure-patterns.ts` | the stderr patterns, each with its measurement |
| `src/lib/media/info.ts` | which of yt-dlp's info JSON is kept, and the synthetic title |
| `src/lib/observability/logger.ts` | the logger and its four sinks |
| `src/lib/observability/http-trace.ts` | the Hono middleware that records one line per request |
| `src/lib/observability/skip-paths.ts` | which request logs never reach OpenObserve (§4.5) |
| `src/lib/pipeline.ts` | stage order and status bookkeeping |
| `src/lib/render/` | document tree -> Notion blocks and row properties |
| `EGRESS_PROXY.md` | the proxy in depth |
| `LLM_STATE.md` | decision log, including approaches ruled out |
| `SESSION_AUTH.md` | cookie jars, sessions, credential lifecycle |

---

## 8. Standing risks

1. **Free WARP is a consumer product.** Server-side egress is outside its
   intended use; it may be rate-limited or blocked. WARP Connector or a
   Zero Trust plan are the sanctioned paths, both one variable away.
2. **One shared exit address.** If it is flagged, every YouTube run fails
   at once.
3. **yt-dlp going stale.** The most likely future outage. Watch for the
   90-day warning.
4. **The signed-in YouTube path is untested.** Anonymous works, so cookies
   are not required for public Shorts. Whether a jar is *accepted* from a
   proxied address — and whether routing a live Google session through a
   foreign consumer IP trips account-security heuristics — is unknown.
5. **`bun run lint` passes as of 2026-09-03, but 57 warnings remain.** All
   are `useSortedClasses` (Tailwind class order). Their autofix is
   classified UNSAFE because reordering can change which of two conflicting
   utilities wins, so they were left rather than bulk-applied. `--write`
   will not touch them; `--write --unsafe` would, and should be done with
   screenshots.

---

## 9. PWA / TWA (Android)

### What is served from where

Everything the Android app is comes from the web deploy. The installed
package contributes a launcher icon, a chrome-less window, and the share
sheet entry — nothing else.

| URL | Source in repo | Notes |
|---|---|---|
| `/manifest.webmanifest` | `src/app/manifest.ts` | Generated route, `application/manifest+json`. Next injects the `<link rel="manifest">`. Holds `share_target`. |
| `/sw.js` | `public/sw.js` | Must be at the origin root: a worker's scope is its own directory, and it has to control `/`. |
| `/offline.html` | `public/offline.html` | Static, self-contained. Precached at SW install. |
| `/icons/icon-{192,512}.png` | `public/icons/` | `purpose: any`. |
| `/icons/icon-maskable-512.png` | `public/icons/` | Separate art — content inside the 80% safe circle. |
| `/.well-known/assetlinks.json` | `public/.well-known/` | Release key SHA-256. Serving this is what removes the browser chrome. |
| `/share` | `src/app/share/` | Share-sheet landing. **Not** session-gated. |

Adding anything to `public/` needs a **rebuild**, not just a restart — Next
computes its static-file manifest at build time. A new `public/` file on a
stale build falls through to `(dashboard)/[...catchAll]` and 307s to
`/login`. That is what a "why is my new asset redirecting" report means.

### Service worker cache policy

- `/api/**` is **network-only**, never cached. Run data is per-user and
  changes every 2s; the vault serves credential metadata. A stale cached run
  is worse than an error. The guard is the whole `/api` prefix so bumping
  `config.api.version` cannot open a hole.
- RSC payloads (`?_rsc=`) are excluded for the same reason.
- Cache-first applies **only** to responses whose `cache-control` contains
  `immutable`. Production Next stamps that on content-hashed build output;
  `next dev` does not, so the worker caches nothing in dev and cannot serve
  a stale rebuilt chunk.
- Bumping `PRECACHE`/`RUNTIME` in `public/sw.js` is what evicts the previous
  generation in `activate`. Change the fetch strategy without bumping and
  existing installs keep the old caches.

Verify no authenticated response is cached:

```js
// DevTools console, after using the app
(async () => {
  let api = []
  for (const n of await caches.keys())
    api.push(...(await (await caches.open(n)).keys())
      .map(r => new URL(r.url).pathname).filter(p => p.startsWith("/api")))
  return api           // MUST be []
})()
```

### Rotating the signing key

Full procedure in `mobile/twa/README.md` §6. The order that matters:
**deploy the new fingerprint in `assetlinks.json` BEFORE shipping the APK
signed with the new key**, and list both fingerprints during the overlap so
there is never a window where neither verifies.

The keystore lives at `~/.relay-twa/android.keystore`, outside the repo.
`*.keystore`, `*.jks` and `keystore-password.txt` are gitignored from both
the repo root and `mobile/twa/`. Lose it and no installed copy can ever be
updated; leak it and anyone can sign a package Android trusts as Relay.

### What breaks if assetlinks drifts

**Symptom: the app launches but shows a URL bar.** Nothing errors, nothing
logs. Digital Asset Links failed, so Android fell back to a plain Custom
Tab. Causes, in order of likelihood:

1. The APK was signed with a different key than the fingerprint on the site
   (including Play App Signing re-signing the upload key — if you publish
   through Play, its signing fingerprint must be added too).
2. `assetlinks.json` is not reachable: wrong content type, a redirect, or
   behind auth. It must be `200 application/json` at
   `https://<domain>/.well-known/assetlinks.json`.
3. `packageId` in `twa-manifest.json` no longer matches `package_name`.

Decisive check — `"linked": true` is the only acceptable answer, and an
**absent** `linked` field means false:

```bash
curl -s -G https://digitalassetlinks.googleapis.com/v1/assetlinks:check \
  --data-urlencode "source.web.site=https://relay.k79.quest" \
  --data-urlencode "relation=delegate_permission/common.handle_all_urls" \
  --data-urlencode "target.android_app.package_name=space.k79.relay" \
  --data-urlencode "target.android_app.certificate.sha256_fingerprint=7C:51:9F:AE:2F:05:42:F2:92:1E:A2:1C:12:01:2B:BC:C6:BC:91:7A:AE:42:CD:BE:BA:6C:11:2F:7E:5E:08:F8"
```

Get the direction right: the **web site is the source** and the app is the
target. Querying `source.android_app` returns a bare `{"maxAge": "3600s"}`
that looks like a failure and is really a malformed question.

### Share-sheet ordering dependency

`share_target` in `src/app/manifest.ts` is what Bubblewrap turns into the
`ACTION_SEND` intent-filter in `AndroidManifest.xml`, and **only at
`init`/`update` time**. Change it and you must re-run `bubblewrap update`
and ship a new APK, or the installed app and the site silently disagree.
The web manifest alone never puts an app in the Android share sheet.

### Expected behaviour that is NOT a bug

- Instagram shows its **own** share UI first; Relay is not in that top row.
  "Share to… / More" opens the Android system sheet, where Relay appears.
- Android ranks that sheet by usage, so on a fresh install Relay sits low.
- A PWA cannot publish Direct Share / Sharing Shortcuts, so Relay will never
  occupy the top person-shortcut row.
- `theme_color` follows `prefers-color-scheme` (the OS), while the app's own
  theme comes from next-themes with `defaultTheme="dark"`. A light OS with a
  dark app therefore gets a white status bar. Closing that needs the
  provider switched to `"system"` or a client component rewriting the meta
  tag — both change theming app-wide.

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
| `warp-egress` | Cloudflare WARP, SOCKS5 on `1080` | **Every YouTube run fails** |

```bash
ssh <prod-host>
sudo docker ps --format "{{.Names}} | {{.Status}}"
```

`relay`, `worker` and `dragonfly` are services in `docker-compose.yml` and
deploy together. `warp-egress` is a **separate Coolify resource** and
deploys on its own.

### External services it depends on

| service | used for | failure mode |
| --- | --- | --- |
| Turso (libSQL) | all persistent data | runs fail at the first write |
| Notion (user OAuth) | publishing | fails at `publishing`; transcript and extraction already done |
| Whisper-class API (user key) | transcription | fails at `transcribing` |
| LLM API (user key) | routing, extraction, verification | fails at `extracting` |
| Cloudflare WARP | YouTube egress | see §3 |
| OpenObserve | logs, and run logs older than the live window | logs missing; runs unaffected |

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
worker --socks5://warp:1080--> warp-egress --WireGuard--> Cloudflare --> YouTube
```

| piece | where it lives |
| --- | --- |
| `MEDIA_PROXY_URL` | Coolify env var on the app = `socks5://warp:1080` |
| the proxy | Coolify resource `warp-egress`, image pinned |
| which sources use it | `proxied` flag in `src/lib/media/sources.ts` |
| where it is applied | `src/lib/media/download.ts`, as `--proxy` |

**Only YouTube is proxied.** Instagram has no `proxied` flag and goes
direct — it works direct and authenticates with the user's own cookie jar,
so routing it through a third party would add risk for nothing.

**No authentication.** Free WARP self-enrols and generates its own device
identity, so there is no secret to manage here. If the exit address is ever
blocked, delete `/var/lib/cloudflare-warp/` inside that container and
restart — it re-enrols with a fresh address.

### The manual step

Coolify puts a standalone resource on its shared network while the app sits
on its own. **They cannot see each other by default**, and `--network` in
*Custom Docker Run Options* is silently dropped by Coolify.

So after **every deploy or restart of `warp-egress`**:

```bash
C=$(sudo docker ps --format '{{.Names}}' | grep <warp-resource-name>)
sudo docker network connect --alias warp <app-network> "$C"
```

Deploying the app does **not** need this. Only `warp-egress` being
recreated does.

Verify with:

```bash
sudo docker exec $(sudo docker ps -qf name=worker) getent hosts warp
# expect an address; nothing means the attach is missing
```

Do **not** solve this by putting the app on the shared network instead:
Dragonfly runs with no password, and that would expose the job queue to
every other container on the host.

### Rollback

Set `MEDIA_PROXY_URL` to empty and redeploy. `download.ts` omits `--proxy`
when it is empty, so every fetch goes direct — no code revert needed. The
proxy container can keep running harmlessly.

Because the pipeline reads a **URL**, switching to a Zero Trust plan or a
commercial residential proxy is that one variable and no code change.

---

## 4. Triage

### 4.1 Read the run's own logs first

The run detail page has a collapsible log stream under each stage. Expand
**Downloading** — it carries yt-dlp's own output. Usually faster than
anything else here.

Two limits, before you trust an empty panel:

- The live window is in Dragonfly with a TTL, and **a deploy restarts
  Dragonfly**, so logs from before the last deploy are gone.
- Older runs fall back to OpenObserve, which holds `info` and above — the
  yt-dlp `debug` lines are missing from history.

### 4.2 Match the message

| message | means | check |
| --- | --- | --- |
| "outbound proxy is unavailable" | our egress is down | §3, the manual attach |
| "challenging this server as automated traffic" | traffic went **direct** — the proxy was not used | `MEDIA_PROXY_URL` non-empty; `proxied` set for the source |
| "no client offered a downloadable audio format" | usually a **stale yt-dlp** | §5 |
| "refused every available client (HTTP 403)" | CDN refusal | §5 first |
| "Your … session has expired" | a supplied cookie jar was rejected | Vault. Only fires when a jar was actually sent |
| stuck on `queued` | worker down, or enqueue failed | §1 |
| fails at `transcribing` / `extracting` | user's API key invalid, out of credit, or rate-limited | Vault |

### 4.3 Error classification

`src/lib/media/download.ts` maps failures onto a ladder, and **the order is
load-bearing** — several of these messages overlap textually, so the wrong
order reports the wrong cause:

| order | condition | resolves to | why it sits here |
| --- | --- | --- | --- |
| 1 | proxy unreachable | `DOWNLOAD_FAILED` (retryable) | The SOCKS layer reports a refused tunnel as a `403` in some yt-dlp versions. Read as a client 403 it classifies **permanent**, so a brief proxy restart would fail every overlapping run for good |
| 2 | `403` from every client | `SOURCE_UNAVAILABLE` | Means the same with or without a jar, so it must never read as an expired session |
| 3 | bot check | `SOURCE_UNAVAILABLE` | A jar cannot answer a challenge aimed at the server's address; counting it against the credential would retire a working session |
| 4 | no matching format | `SOURCE_UNAVAILABLE` | Its text contains "not available", so without this it falls into the login branch and — with a jar present — reports as an expired session |
| 5 | login-shaped | `SESSION_EXPIRED` **only if a jar was sent**, else `SOURCE_UNAVAILABLE` | The one case that genuinely means "your session died" |

Only `SESSION_EXPIRED` counts against a credential, and a completed
download is the only thing that clears its reject counter.

**Known weakness:** classification uses the **last** attempt's stderr, so
when the default client 403s and the fallback clients then report "no
formats", the informative 403 is discarded.

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
| `docker-compose.yml` | `relay`, `worker`, `dragonfly`, the shared env block |
| `src/config/index.ts` | every env var, with its reasoning |
| `src/lib/media/sources.ts` | source registry — hosts, URL patterns, `proxied` |
| `src/lib/media/download.ts` | yt-dlp invocation, the error ladder, `scrubProxy` |
| `src/lib/pipeline.ts` | stage order and status bookkeeping |
| `src/lib/render/` | document tree -> Notion blocks and row properties |
| `EGRESS_PROXY.md` | the proxy in depth |
| `LLM_STATE.md` | decision log, including approaches ruled out |
| `SESSION_AUTH.md` | cookie jars, sessions, credential lifecycle |

---

## 8. Standing risks

1. **The manual network attach (§3).** Not durable. Redeploy the proxy
   resource and YouTube stops until one command is run. Moving it back to a
   compose service removes this entirely.
2. **Free WARP is a consumer product.** Server-side egress is outside its
   intended use; it may be rate-limited or blocked. WARP Connector or a
   Zero Trust plan are the sanctioned paths, both one variable away.
3. **One shared exit address.** If it is flagged, every YouTube run fails
   at once.
4. **yt-dlp going stale.** The most likely future outage. Watch for the
   90-day warning.
5. **The signed-in YouTube path is untested.** Anonymous works, so cookies
   are not required for public Shorts. Whether a jar is *accepted* from a
   proxied address — and whether routing a live Google session through a
   foreign consumer IP trips account-security heuristics — is unknown.
6. **`lint` is not clean on `main`.** Pre-existing errors unrelated to the
   pipeline. `typecheck` IS clean; check per-file rather than trusting the
   whole-repo lint result.

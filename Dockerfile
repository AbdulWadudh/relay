# syntax=docker/dockerfile:1

# Pinned rather than floating on `oven/bun:1` so a Coolify deploy builds on
# the runtime this repo is developed against. `-slim` because the only OS
# packages Relay needs are the media binaries installed explicitly below.
ARG BUN_VERSION=1.3.1

# ---------------------------------------------------------------- deps ---
# Dependencies on their own layer so editing source never re-runs install.
#
# NODE_ENV is deliberately left unset: the build needs devDependencies
# (tailwind, typescript) and the runtime needs drizzle-kit, which
# `bun run db:migrate` invokes on container start.
FROM oven/bun:${BUN_VERSION}-slim AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ------------------------------------------------------------- builder ---
# Compiles the Next.js app, and nothing else — no media binaries here, they
# belong to the process that shells out to them. Splitting the build off
# from the runtime stage keeps two large build-only artefacts out of the
# shipped image: Bun's global install cache under /root/.bun, and
# `.next/cache`, which exists to make the NEXT build faster and is dead
# weight once the image is built.
FROM oven/bun:${BUN_VERSION}-slim AS builder
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules

# These values are intentionally public and are compiled into the browser
# bundle for the OpenObserve RUM/logs SDK; server credentials remain
# runtime-only. Declared AFTER the dependency copy: they are baked into ENV,
# so bumping one changes this layer's cache key, and anything above it would
# be reinstalled on a deploy that only touched a version string.
ARG NEXT_PUBLIC_OPENOBSERVE_CLIENT_TOKEN
ARG NEXT_PUBLIC_OPENOBSERVE_APPLICATION_ID=relay-app
ARG NEXT_PUBLIC_OPENOBSERVE_SITE
ARG NEXT_PUBLIC_OPENOBSERVE_ORG
ARG NEXT_PUBLIC_OPENOBSERVE_SERVICE=relay-app
ARG NEXT_PUBLIC_OPENOBSERVE_VERSION=0.1.0
ENV NEXT_PUBLIC_OPENOBSERVE_CLIENT_TOKEN=${NEXT_PUBLIC_OPENOBSERVE_CLIENT_TOKEN} \
    NEXT_PUBLIC_OPENOBSERVE_APPLICATION_ID=${NEXT_PUBLIC_OPENOBSERVE_APPLICATION_ID} \
    NEXT_PUBLIC_OPENOBSERVE_SITE=${NEXT_PUBLIC_OPENOBSERVE_SITE} \
    NEXT_PUBLIC_OPENOBSERVE_ORG=${NEXT_PUBLIC_OPENOBSERVE_ORG} \
    NEXT_PUBLIC_OPENOBSERVE_SERVICE=${NEXT_PUBLIC_OPENOBSERVE_SERVICE} \
    NEXT_PUBLIC_OPENOBSERVE_VERSION=${NEXT_PUBLIC_OPENOBSERVE_VERSION}

COPY . .
# Keep the complete compiler output visible in Coolify when BuildKit only
# reports the outer `RUN` failure.
RUN bun run build > /tmp/relay-build.log 2>&1 || (cat /tmp/relay-build.log && exit 1); \
    rm -rf .next/cache

# ------------------------------------------------------------- runtime ---
FROM oven/bun:${BUN_VERSION}-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Media engine host binaries (TRD §1). The pipeline shells out to these via
# Bun `$`; without them in the image every run fails at preflight. ffmpeg
# comes from Debian; yt-dlp ships a self-contained build per architecture,
# pinned so an upstream release can't silently change extraction behaviour
# between deploys.
#
# instaloader is the exception that pulls in Python: Instagram refuses
# yt-dlp anonymously ("rate-limit reached or login required") but serves
# instaloader, which ships no self-contained binary. Pinned for the same
# reason yt-dlp is. Only Instagram runs invoke it.
#
# First instruction of the stage on purpose: it depends only on the base
# image and these two versions, so it stays cached across every deploy that
# touches app code — apt is not re-run and yt-dlp is not re-downloaded.
ARG YT_DLP_VERSION=2026.03.17
ARG INSTALOADER_VERSION=4.15.3
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      ffmpeg curl ca-certificates python3 python3-pip; \
    rm -rf /var/lib/apt/lists/*; \
    arch="$(dpkg --print-architecture)"; \
    case "$arch" in \
      amd64) asset=yt-dlp_linux ;; \
      arm64) asset=yt-dlp_linux_aarch64 ;; \
      *) echo "unsupported architecture for yt-dlp: $arch" >&2; exit 1 ;; \
    esac; \
    curl -fsSL -o /usr/local/bin/yt-dlp \
      "https://github.com/yt-dlp/yt-dlp/releases/download/${YT_DLP_VERSION}/${asset}"; \
    chmod +x /usr/local/bin/yt-dlp; \
    pip3 install --no-cache-dir --break-system-packages \
      "instaloader==${INSTALOADER_VERSION}"; \
    yt-dlp --version; \
    instaloader --version; \
    ffmpeg -version | head -n 1

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next

# One image runs three things, and each needs a different slice of the repo:
# `next start` reads .next/, next.config.ts and public/; `db:migrate` reads
# drizzle.config.ts, drizzle/ and src/config; `bun scripts/worker.ts` reads
# scripts/ and src/, resolving its `@/*` imports through tsconfig.json.
# Copied explicitly rather than as `COPY . .` so build-only files stay out.
#
# THESE MUST STAY ABOVE `FROM runtime AS capture`. They previously sat at
# the END of the file, which put them in the CAPTURE stage — every
# instruction after a FROM belongs to that stage. The damage was total and
# silent: `runtime` ended up with no source and no CMD (an unusable stage),
# `relay`/`worker` build no `target` so Docker gave them the LAST stage —
# capture, Chromium and all — and capture's own
# `CMD ["bun", "scripts/capture.ts"]` was overridden by the `next start`
# CMD below it, so the capture service ran a SECOND Next.js server and
# raced `relay` on `db:migrate` at every start.
COPY package.json bun.lock next.config.ts tsconfig.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY public ./public
COPY src ./src
COPY scripts ./scripts

EXPOSE 3000

CMD ["sh", "-c", "bun run db:migrate && exec bun --bun next start --hostname 0.0.0.0 --port 3000"]

# ------------------------------------------------------------- capture ---
# The session-capture service (SESSION_AUTH.md §2) is its OWN stage layered
# on the runtime, not part of it. Chromium plus Xvfb is roughly 400MB, and
# only this one process ever executes it — baking it into `runtime` would
# make the web and worker images carry 400MB they never run.
#
# Headful under Xvfb is deliberate: Instagram fingerprints `--headless=new`
# aggressively, which is the whole reason a real display is needed.
FROM runtime AS capture
ARG DEBIAN_FRONTEND=noninteractive
# `xauth` and `chromium-sandbox` are NOT optional extras, and both were
# missing because --no-install-recommends drops them (measured 2026-09-02
# by running this stage):
#
#   * xvfb ships `xvfb-run`, but that script shells out to `xauth` to mint
#     the display cookie. Without it every launch died at
#     "xvfb-run: error: xauth command not found" — so the capture service
#     could not open a browser AT ALL in the container.
#   * Debian splits Chromium's setuid sandbox helper into `chromium-sandbox`.
#     Without it Chromium refuses to start with "No usable sandbox!", which
#     is precisely the message that pushes people to --no-sandbox.
#
# `xvfb-run --help` is smoke-tested here rather than only `Xvfb -help`: the
# old check passed while the launcher path was broken.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      chromium chromium-sandbox xvfb xauth \
      fonts-liberation fonts-noto-color-emoji; \
    rm -rf /var/lib/apt/lists/*; \
    chromium --version; \
    test -u /usr/lib/chromium/chrome-sandbox; \
    command -v xauth; \
    xvfb-run --help >/dev/null 2>&1 || true; \
    Xvfb -help >/dev/null 2>&1 || true

# Chromium's sandbox is kept ON (src/lib/capture/chromium.ts), and it needs
# an unprivileged user to sandbox INTO — running as root is what forces
# people to reach for --no-sandbox. `capture` owns the data dir because that
# is where per-session browser profiles are written.
RUN useradd --create-home --shell /usr/sbin/nologin capture \
    && mkdir -p /app/data \
    && chown -R capture:capture /app/data
USER capture

ENV CHROMIUM_PATH=chromium \
    XVFB_RUN_PATH=xvfb-run \
    CAPTURE_USE_XVFB=true

EXPOSE 3002
# LAST instruction of the file on purpose. A stage keeps only its final
# CMD, so anything appended below this line would silently replace the
# capture entrypoint — which is exactly the bug this file used to have.
CMD ["bun", "scripts/capture.ts"]

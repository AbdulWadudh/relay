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
COPY package.json bun.lock next.config.ts tsconfig.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY public ./public
COPY src ./src
COPY scripts ./scripts

EXPOSE 3000

CMD ["sh", "-c", "bun run db:migrate && exec bun --bun next start --hostname 0.0.0.0 --port 3000"]

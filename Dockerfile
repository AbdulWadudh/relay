FROM oven/bun:1

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Media engine host binaries (TRD §1). The pipeline shells out to these via
# Bun `$`; without them in the image every run fails at preflight. ffmpeg
# comes from Debian; yt-dlp ships a self-contained build per architecture
# (no Python runtime needed), pinned so an upstream release can't silently
# change extraction behaviour between deploys.
#
# Deliberately placed ABOVE the NEXT_PUBLIC ARG/ENV block: those ENV values
# are baked from build args, so changing one (a release bumping
# NEXT_PUBLIC_OPENOBSERVE_VERSION, say) changes that layer's cache key and
# invalidates every layer after it — re-running apt and re-downloading
# yt-dlp on a deploy that only touched app code. Up here the layer depends
# only on the base image, so it stays cached across ordinary pushes.
ARG YT_DLP_VERSION=2026.03.17
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ffmpeg curl ca-certificates; \
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
    yt-dlp --version; \
    ffmpeg -version | head -n 1

# These values are intentionally public and are compiled into the browser bundle
# for the OpenObserve RUM/logs SDK. Server credentials remain runtime-only.
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

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
# Keep the complete compiler output visible in Coolify when BuildKit only
# reports the outer `RUN` failure.
RUN bun run build > /tmp/relay-build.log 2>&1 || (cat /tmp/relay-build.log && exit 1)

EXPOSE 3000

CMD ["sh", "-c", "bun run db:migrate && exec bun --bun next start --hostname 0.0.0.0 --port 3000"]

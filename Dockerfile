FROM oven/bun:1

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

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

FROM oven/bun:1

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

EXPOSE 3000

CMD ["sh", "-c", "bun run db:migrate && exec bun --bun next start --hostname 0.0.0.0 --port 3000"]

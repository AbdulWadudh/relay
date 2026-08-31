#!/usr/bin/env bun
// Frees the dev server port before starting Next.js, so a stale `bun run dev`
// process left over from a previous session doesn't block with EADDRINUSE.
import { $ } from "bun"

const port = Number(process.env.PORT ?? 3000)

async function freePort(): Promise<void> {
  if (process.platform === "win32") {
    const output = await $`cmd /c "netstat -ano | findstr :${port} | findstr LISTENING"`
      .text()
      .catch(() => "")
    const pids = new Set(
      output
        .split("\n")
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((pid): pid is string => !!pid && pid !== "0"),
    )
    for (const pid of pids) {
      console.error(`[free-port] killing stale process ${pid} on port ${port}`)
      await $`taskkill /PID ${pid} /F`.quiet().catch(() => {})
    }
  } else {
    await $`lsof -ti:${port} | xargs -r kill -9`.quiet().catch(() => {})
  }
}

await freePort()

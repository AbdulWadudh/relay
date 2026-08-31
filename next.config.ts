import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // @libsql/client ships native bindings and pino spawns a worker-thread
  // transport (thread-stream); this is the documented way to tell Next.js
  // to leave both un-bundled and require() them at runtime instead, which is
  // correct for the production build/start path (verified working). It does
  // NOT fix `next dev`'s Turbopack bundler specifically — that has a known
  // dev-only bug tracing these same packages ("Failed to load external
  // module <pkg>-<hash>") that this option doesn't resolve. Switching dev to
  // --webpack also doesn't help (it hangs on first compile). Until upstream
  // fixes this, test auth/db-touching routes locally via
  // `bun run build && bun run start`, not `bun run dev`.
  serverExternalPackages: ["@libsql/client", "pino"],
}

export default nextConfig

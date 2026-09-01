/**
 * Run worker entrypoint — `bun run worker`.
 *
 * Deliberately a separate process from the Next.js server (its own
 * container in docker-compose): the pipeline shells out to yt-dlp/ffmpeg
 * and waits on Whisper and LLM calls, none of which should occupy a
 * request handler.
 */

import { startWorkerHealthServer } from "@/lib/queue/health"
import { installShutdownHandlers, startRunWorker } from "@/lib/queue/worker"

const worker = startRunWorker()
startWorkerHealthServer(worker)
installShutdownHandlers(worker)

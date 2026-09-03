/**
 * Its own module so `src/lib/pipeline-errors.ts` can classify it without
 * importing `src/lib/analysis.ts`, which imports pipeline-errors back.
 */
export class NoFrameTextError extends Error {
  readonly code = "NO_FRAME_TEXT"

  constructor() {
    super(
      "No readable text or content was found in this video's frames. Nothing could be extracted.",
    )
    this.name = "NoFrameTextError"
  }
}

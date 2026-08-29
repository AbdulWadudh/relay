# Design & Frontend Guidelines - Relay

## 1. UI/UX Philosophy
Relay is a data-dense, utilitarian command center built for power users. The interface reflects the clean, functional aesthetic of Notion, modernized with a high-contrast dark palette, precise typography, and subtle micro-interactions.

- **Default Mode:** Dark mode default (via shadcn/theme provider).
- **Layout:** Collapsible sidebar navigation for Dashboards (Vault, Agents, Queue, Settings) with an expansive main content workbench.
- **Density:** Compact padding, clear tabular layouts, and structured JSON/monospaced code viewers.

---

## 2. Tech Stack & Setup Instructions

### 2.1 ShadCN Initialization
You MUST initialize ShadCN with the following exact preset:

```bash
bunx --bun shadcn@latest init --preset b5pFrsf5Vq --template next --rtl --pointer
```

### 2.2 Component Strictness
- **Zero Native Form Elements:** Native HTML `<input>`, `<select>`, `<textarea>`, or `<button>` elements are strictly forbidden.
- You MUST exclusively use dedicated ShadCN UI components (`<Input />`, `<Select />`, `<Textarea />`, `<Button />`, `<Dialog />`, `<Table />`, etc.).

### 2.3 Typography & Iconography
- **Headings Font:** `Oxanium` (applied to all `h1`, `h2`, `h3`, `h4` tags and dashboard titles).
- **Body Font:** `Space Grotesk` (applied to all standard text, descriptions, and labels).
- **Monospace Font:** `JetBrains Mono` or `Fira Code` (for JSON schemas, transcripts, prompts, and logs).
- **Icon Library:** **HugeIcons** (`@hugeicons/react`) must be used for all UI icons. Do NOT use Lucide.

### 2.4 Animation Standards (GSAP)
- GSAP is authorized strictly for micro-interactions, dashboard page transitions, and pipeline stage progress visuals.
- You MUST use `@gsap/react` and wrap all animations inside the `useGSAP()` hook.
- All target refs must be guarded to prevent Next.js App Router hydration mismatches.
- Standard button hover and focus states must use native Tailwind transitions (`transition-all duration-200`), not GSAP.

---

## 3. Observability (OpenObserve)
- **Platform:** OpenObserve.
- **Client RUM:** Capture page loads, client errors via React Error Boundaries, and user interaction events.
- **Server Logging:** Intercept and route Hono HTTP logs, SQLite query errors, and `yt-dlp` / `ffmpeg` `stderr` outputs directly to OpenObserve ingest streams.
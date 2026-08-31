# Technical Requirements Document (TRD) - Relay

## 1. System Architecture
- **Runtime:** Bun.js (high-performance JavaScript/TypeScript runtime, native SQLite, shell execution).
- **Frontend:** Next.js (App Router), Tailwind CSS, ShadCN UI, and GSAP (`@gsap/react`).
- **Backend API:** Hono (mounted modularly inside Next.js App Router API route handlers).
- **Database:** Bun native `bun:sqlite`.
- **Media Processing:** Host OS binaries (`yt-dlp`, `ffmpeg`) executed via Bun's `$` shell API.
- **Observability:** OpenObserve (self-hosted/managed) for unified logs and RUM telemetry.

---

## 2. Data Schema (SQLite)

```sql
-- Users Table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL
);

-- Polymorphic Credentials Vault Table
CREATE TABLE credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK(type IN ('api_key', 'ray')) NOT NULL,
  provider TEXT NOT NULL, -- 'openai', 'groq', 'gemini', 'notion'
  access_token TEXT NOT NULL, -- AES-256-GCM Encrypted
  refresh_token TEXT, -- AES-256-GCM Encrypted, Nullable
  expires_at INTEGER, -- Unix timestamp in ms, Nullable (Indexed)
  meta_data TEXT, -- Plaintext JSON string (workspace_id, bot_id, scopes, etc.)
  iv TEXT NOT NULL, -- Initialization Vector for AES-256-GCM
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_credentials_user_provider ON credentials(user_id, provider);
CREATE INDEX idx_credentials_expires_at ON credentials(expires_at);

-- Agents Table
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK(type IN ('system', 'human')) NOT NULL,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  expected_output_schema TEXT NOT NULL, -- JSON Schema string
  is_active INTEGER DEFAULT 1 NOT NULL,
  created_at INTEGER NOT NULL
);
```

---

## 3. Core API Routes (Hono - v1)
All routes are mounted at `/api/v1/*`.

### Auth & Credential Vault
- `POST /api/v1/credentials` - Encrypt and persist provider API keys.
- `GET /api/v1/credentials` - Retrieve masked status list of configured providers.
- `GET /api/v1/rays/oauth/notion` - Generate and redirect to Notion authorization URL.
- `GET /api/v1/rays/oauth/notion/callback` - Exchange the provider authorization code, split encrypted tokens from metadata, and persist to `credentials`.

### Agent Management
- `GET /api/v1/agents` - List all System and Human agents.
- `POST /api/v1/agents` - Register a new Human agent with custom prompt and JSON schema.
- `PUT /api/v1/agents/:id` - Update an existing agent prompt or schema definition.
- `DELETE /api/v1/agents/:id` - Remove a custom Human agent.

### Processing Pipeline
- `POST /api/v1/relay/process` - Primary pipeline endpoint:
  1. Accepts `{ url: string, agent_id?: string }`.
  2. Spawns `yt-dlp` and `ffmpeg` via Bun `$` shell to extract MP3 audio to a temp directory.
  3. Decrypts the appropriate AI provider key from `credentials`.
  4. Calls Whisper endpoint to obtain raw transcript and timestamped English translation.
  5. Routes payload to selected (or dynamically synthesized) Agent schema.
  6. Enforces evidence citation verification.
  7. Renders the extracted, evidence-grounded content as rich Markdown, decrypts the target Ray's token, and publishes it to the connected destination (Notion Ray today) in that destination's native format.
  8. Deletes local temp media files.

---

## 4. Security & Cryptographic Standard
- **Cipher:** AES-256-GCM with unique Initialization Vectors (`iv`) per record.
- **Key Management:** A 32-byte hex string stored in `MASTER_ENCRYPTION_KEY` (`.env.local`).
- **Encrypted Columns:** `access_token` and `refresh_token` are always stored encrypted. `meta_data` remains plaintext JSON for uninhibited read queries on metadata.

---

## 5. Development Sub-Tasks (CLI Agent Execution Plan)

### Task 1: Foundation, Database & Vault
- Initialize repository with Bun, Next.js App Router, Hono, and ShadCN.
- Implement SQLite schema (`users`, `credentials`, `agents`) with indexing.
- Build AES-256-GCM encryption/decryption utilities.
- Wire OpenObserve logging provider.

### Task 2: Credentials Dashboard & Notion Ray
- Build Key Management UI using strictly ShadCN components.
- Implement `/api/v1/credentials` routes with input encryption.
- Implement `/api/v1/rays/oauth/notion` and `/api/v1/rays/oauth/notion/callback` flow.

### Task 3: Agent Management System
- Build Agent Dashboard UI with GSAP micro-interactions.
- Implement CRUD routes for System and Human agents.
- Add JSON schema validation utilities for agent output structures.

### Task 4: Relay Media Engine & Markdown Publishing
- Implement `yt-dlp` and `ffmpeg` execution pipeline with error trapping to OpenObserve.
- Build dual-transcription handler (Roman English + Translated English).
- Build Evidence Verification layer and rich Markdown publishing client (Notion Ray today).

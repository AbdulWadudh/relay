# Product Requirements Document (PRD) - Relay

## 1. Executive Summary
**Relay** is an open-source, self-hosted web application that acts as an intelligent bridge between short-form video content (Instagram Reels, YouTube Shorts) and Notion. It locally extracts media via `yt-dlp` and `ffmpeg`, transcribes/translates multilingual audio using user-provided API keys (BYOK), routes content through customizable extraction agents (System-built and Human-built), verifies all claims with timestamped evidence quotes, and syncs structured knowledge pages directly to connected Notion databases through Rays.

---

## 2. Core Problem & Value Proposition
- **Unstructured Video Knowledge:** Actionable information in short-form video (recipes, locations, how-tos, reviews) is locked in dynamic audio/video formats and unsearchable.
- **Hallucination Risk:** Generative extraction frequently invents steps, metrics, or ingredients. Relay enforces evidence grounding for every extracted entity.
- **SaaS Markup & Privacy:** Users should not pay subscription premiums for third-party scrapers or LLM wrappers. Relay uses direct local extraction and a Bring-Your-Own-Key (BYOK) architecture with encrypted credentials.
- **Static Schema Fragility:** Fixed templates cannot handle diverse content. Relay supports default system agents, custom human-authored agent schemas, and dynamic schema generation fallback.

---

## 3. Target User & Use Cases
- **Curators & Researchers:** Archiving how-tos, travel guides, tutorials, and technical breakdowns into a structured Notion second brain.
- **Home Cooks & Makers:** Converting fast-paced recipe or DIY reels into structured checklists, ingredient tables, and step-by-step instructions.
- **Power Users:** Developers and tinkerers who want full control over their API tokens, prompts, and local media processing.

---

## 4. MVP Feature Scope & Requirements

### 4.1 Ingestion & Media Pipeline (P0)
- **URL Handling:** Support for public Instagram Reel and YouTube Shorts links.
- **Zero-Dependency Media Extraction:** Direct local download and audio extraction using host `yt-dlp` and `ffmpeg` binaries.
- **Automatic Cleanup:** Temporary audio/video artifacts are purged immediately post-processing.

### 4.2 Transcription & Translation Engine (P0)
- **Dual-Stream Output:**
  - **Raw Transcription:** Phonetic/Roman English transliteration for non-Latin spoken audio (e.g., Hinglish, Spanglish).
  - **Translated English:** Clean English translation with millisecond-level timestamp alignments.
- **Provider Agnostic:** Powered via user-configured BYOK endpoints (e.g., Groq Whisper-large-v3, OpenAI Whisper).

### 4.3 Agent Routing & Extraction (P0)
- **Agent Types:**
  - **System Agents:** Out-of-the-box extraction templates for core archetypes (`Recipe`, `Location/Place`).
  - **Human Agents:** User-defined prompts and custom JSON output schemas created via the Agent Dashboard.
- **Dynamic Schema Synthesizer:** Fallback agent that dynamically generates a bespoke schema and extraction prompt for novel categories.
- **Evidence Verification Layer:** Every extracted property, ingredient, or step must include an `evidence` object containing `timestamp_start`, `timestamp_end`, and `transcript_quote`.

### 4.4 BYOK Vault & Notion Integration (P0)
- **Encrypted Credential Vault:** Secure at-rest storage (AES-256-GCM) for third-party AI provider keys and Notion Ray tokens.
- **Notion Ray:** Native OAuth 2.0 authorization flow (`/api/v1/rays/oauth/notion/callback`) with workspace selection and database mapping.
- **Structured Page Publishing:** Automated block and property layout creation in Notion with toggleable evidence callouts.

### 4.5 Observability & UI (P0)
- **Full-Stack Telemetry:** OpenObserve integration for client Real User Monitoring (RUM) and backend error/execution logging.
- **Dedicated Dashboards:** Clean interfaces for Agent Management, Vault/Credential Management, and the Processing Queue.

---

## 5. Strict Out of Scope (MVP)
- Paid third-party scraping APIs (Apify, RapidAPI).
- Visual frame-by-frame OCR / computer vision analysis.
- Multi-tenant user billing, team workspaces, or hosted SaaS tiers.
- Permanent cloud storage of downloaded raw media files.

---

## 6. Success Metrics
1. **100% Grounding:** Every extracted entity maps to an exact transcript quote and timestamp range.
2. **Sub-30s Processing:** End-to-end execution (URL ingestion to Notion page creation) completes in under 30 seconds for standard <60s clips.
3. **Zero Plaintext Token Exposure:** API keys and Ray tokens are never logged or exposed in plaintext.

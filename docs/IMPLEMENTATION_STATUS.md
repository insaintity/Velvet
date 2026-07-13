# Implementation Status

## Current Build

Implemented:

- Repository scaffold
- Next.js app shell
- Velvet design tokens
- Sidebar and top bar
- First-launch dashboard
- Empty-state and populated project library states
- Upload history page backed by prompt and job records
- Upload records with YouTube link, render context, prompt snapshot and usage snapshot
- Provider setup screen with persisted setup state
- Encrypted local secret storage under `.velvet/`
- Env-backed production secret provider option
- HashiCorp Vault-compatible managed secret provider option
- User-provided Supabase/Postgres database URL storage and validation
- Supabase/Postgres schema initialization and local-record sync
- Hosted/local database conflict merge with newest-record wins
- Supabase CLI project linked to `tivxgfblnzwfwtynbbuu`
- Velvet schema migration applied remotely
- Opt-in Postgres hosted mirror mode via `VELVET_DATABASE_MODE=postgres`
- Real OpenAI key validation
- Real ElevenLabs key validation
- ChatGPT/OpenAI album blueprint generation endpoint
- Project database persisted to `.velvet/db.json`
- Project detail screen with blueprint review
- Project editing for title, concept, prompts, and YouTube metadata
- Blueprint approval endpoint and workflow controls
- Prompt/version history records
- Job queue records for blueprint, music, render and YouTube upload work
- Local worker process for queued music, render and YouTube upload jobs
- Worker container target for managed production runtimes
- Provider usage records for OpenAI, ElevenLabs, FFmpeg, and YouTube operations
- Budget guardrails for track count and render attempts
- Configurable cost estimates for OpenAI, ElevenLabs, FFmpeg, and YouTube usage records
- Upload privacy selector
- Same-origin guard on mutating API routes
- ElevenLabs music generation endpoint for blueprint tracks
- Full-album render manifest and FFmpeg MP4 composition
- Safe YouTube upload path validation
- YouTube OAuth login with state validation
- YouTube OAuth token exchange and encrypted refresh-token storage
- YouTube channel lookup after OAuth
- YouTube upload endpoint using resumable uploads
- YouTube upload idempotency check to avoid duplicate uploads on retry
- Permanent bottom player with disabled empty state and Zustand shell state
- New-project brief flow
- Documentation spine
- Playwright browser coverage
- Vitest coverage for core utilities and encrypted storage

Pending:

- Provider-specific deployment hardening after the production host is chosen

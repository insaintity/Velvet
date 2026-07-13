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
- Provider setup screen with persisted setup state
- Encrypted local secret storage under `.velvet/`
- Real OpenAI key validation
- Real ElevenLabs key validation
- ChatGPT/OpenAI album blueprint generation endpoint
- Project database persisted to `.velvet/db.json`
- Project detail screen with blueprint review
- Project editing for title, concept, prompts, and YouTube metadata
- Blueprint approval endpoint and workflow controls
- Prompt/version history records
- Job queue records for blueprint, music, render and YouTube upload work
- Provider usage records for OpenAI, ElevenLabs, FFmpeg, and YouTube operations
- Upload privacy selector
- Same-origin guard on mutating API routes
- ElevenLabs music generation endpoint for blueprint tracks
- Render manifest export endpoint with FFmpeg detection
- Safe YouTube upload path validation
- YouTube OAuth login with state validation
- YouTube OAuth token exchange and encrypted refresh-token storage
- YouTube channel lookup after OAuth
- YouTube upload endpoint using resumable uploads
- Permanent bottom player with disabled empty state and Zustand shell state
- New-project brief flow
- Documentation spine
- Playwright browser coverage
- Vitest coverage for core utilities and encrypted storage

Pending:

- Supabase persistence
- Durable background workers outside the request lifecycle
- Full FFmpeg MP4 rendering requires FFmpeg on PATH or `FFMPEG_PATH`
- Provider usage/cost accounting
- Production vault/KMS integration

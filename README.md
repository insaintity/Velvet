# Velvet

Velvet is an AI album foundry for creating complete jazz albums and preparing them for YouTube release.

The app opens like a brand-new workspace and guides the user through setup before any generation workflow begins. Provider keys and OAuth tokens are encrypted locally, and the first working backend paths are in place for setup, blueprint generation, prompt history, jobs, rendering manifests, and YouTube upload.

## What It Does

- Collects a natural-language album brief.
- Onboards the required services: ChatGPT/OpenAI, ElevenLabs, YouTube, storage, and worker settings.
- Encrypts provider secrets before local storage.
- Validates OpenAI and ElevenLabs keys.
- Lets users provide their own Supabase/Postgres database URL and validates the connection.
- Initializes `velvet_*` tables in a user-provided Supabase/Postgres database and syncs local records into them.
- Includes a Supabase CLI migration for the Velvet schema.
- Supports opt-in hosted database mirroring with `VELVET_DATABASE_MODE=postgres`.
- Generates album blueprints with OpenAI once setup is complete.
- Provides a project review screen for approving blueprints before paid generation.
- Lets the user edit project title, concept, generation prompts, and YouTube metadata before generation/upload.
- Stores projects, prompt versions, jobs, and upload records in a local project database.
- Records provider usage units for blueprint, music, render, and upload operations.
- Estimates provider and render costs when optional local rates are configured.
- Queues music, render, and YouTube upload jobs for a separate Velvet worker process.
- Exchanges YouTube OAuth codes for tokens and stores refresh tokens encrypted.
- Provides backend routes for ElevenLabs music generation, render manifests, and YouTube uploads.
- Provides a fixed, no-scroll studio interface with dark midnight styling.
- Shows empty Projects and Upload History states until real user work exists.
- Defines the upload history surface that will preserve the prompts used for each uploaded release.

## Tech Stack

- Next.js App Router
- React
- TypeScript strict mode
- Tailwind CSS
- Zustand
- Zod
- Lucide icons
- Framer Motion
- Vitest
- Playwright

## Quick Start

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000/dashboard
```

Run the worker in a second terminal when you want queued generation, render, and upload jobs to process:

```bash
npm run worker
```

For one-off local checks, process at most one queued job:

```bash
npm run worker:once
```

For production worker deployment, see `docs/DEPLOYMENT.md` and `Dockerfile.worker`.

Railway is the recommended low-cost production target. The repo includes `railway.json` for the web service; add a second Railway service from the same repo for `npm run worker`.

## Available Routes

- `/dashboard` - first-launch studio overview
- `/projects/new` - album brief entry
- `/projects` - empty project library
- `/history` - upload history and prompt archive
- `/settings` - onboarding for ChatGPT/OpenAI, ElevenLabs, YouTube login, storage, and worker setup

## Onboarding

Velvet is focused on:

- ChatGPT/OpenAI for album planning, prompt refinement, artwork prompts, image generation, and YouTube metadata
- ElevenLabs for music generation
- YouTube login via Google OAuth for private uploads, thumbnails, metadata, and publishing workflows

The setup UI saves keys through server routes. Secrets are encrypted with AES-GCM and stored in the gitignored `.velvet/` folder. Production deployments can set `VELVET_SECRET_PROVIDER=env` for host-provided secrets or `VELVET_SECRET_PROVIDER=vault` for a HashiCorp Vault-compatible KV v2 store.

## Upload History

The History page is designed to log every uploaded album with:

- YouTube video ID and URL
- Privacy state
- Thumbnail asset
- Render manifest
- Provider usage
- Error and retry log
- Album brief
- Album blueprint prompt
- Track music prompts
- Album cover prompt
- YouTube thumbnail prompt
- Video background prompt
- YouTube metadata prompt

## Validation

Run the full local verification suite:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

The Playwright suite checks the primary pages at desktop sizes and verifies that the main studio pages do not create page-level scrolling.

## Environment

Copy `.env.example` and fill in values when backend persistence and provider integrations are implemented.

```bash
cp .env.example .env.local
```

Important variables include:

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `YOUTUBE_REDIRECT_URI` such as `http://localhost:3000/api/youtube/callback`
- `FFMPEG_PATH` optional path to `ffmpeg.exe` when FFmpeg is not on PATH
- `SUPABASE_URL`
- `DATABASE_URL`
- `VELVET_DATABASE_MODE` set to `postgres` to mirror runtime records into the configured database
- `VELVET_SECRET_PROVIDER` set to `env` to read secrets from deployment environment variables
- `VELVET_SECRET_PROVIDER=vault`, `VELVET_VAULT_ADDR`, `VELVET_VAULT_TOKEN`, `VELVET_VAULT_MOUNT`, and `VELVET_VAULT_PATH` for managed Vault-backed secrets
- `VELVET_MASTER_KEY` or `TOKEN_ENCRYPTION_KEY` for deterministic local secret encryption
- `YOUTUBE_REFRESH_TOKEN` for env-backed YouTube OAuth token storage
- `VELVET_OPENAI_INPUT_PER_1M_TOKENS_USD`, `VELVET_OPENAI_OUTPUT_PER_1M_TOKENS_USD`, `VELVET_ELEVENLABS_PER_MINUTE_USD`, `VELVET_FFMPEG_PER_RENDER_MINUTE_USD`, and `VELVET_YOUTUBE_UPLOAD_PER_VIDEO_USD` for optional local cost estimates
- `VELVET_WORKER_INTERVAL_MS` polling interval for the local durable worker
- `WORKER_SECRET`

## Current Limitations

- The local `.velvet/` database is intended for development and single-user desktop use.
- Long-running music, render, and upload work is queued for the worker process. Production should run the worker as a managed service/container.
- The render endpoint creates a render manifest and renders a full-album MP4 when FFmpeg is available.
- YouTube upload requires a real rendered MP4 path and configured Google OAuth credentials.
- User-provided Supabase/Postgres connections can be saved, validated, initialized, synced, and used as an opt-in hosted mirror.
- Budget guardrails enforce local action limits, and cost estimates depend on user-provided rates rather than hardcoded provider pricing.

## Design Direction

The interface should remain a dense, premium, midnight studio console:

- dark plum and navy surfaces
- rose, violet, and blue lighting
- editorial serif branding
- fixed no-scroll pages
- compact, purposeful controls
- no generic SaaS dashboard styling

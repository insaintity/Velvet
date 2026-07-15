# Velvet

Velvet is an AI music foundry for creating individual songs or complete albums and preparing them for YouTube release.

The app opens like a brand-new workspace and guides the user through setup before any generation workflow begins. Provider keys and OAuth tokens are encrypted locally, and the first working backend paths are in place for setup, blueprint generation, prompt history, jobs, rendering manifests, and YouTube upload.

## What It Does

- Collects a natural-language prompt for a song or album.
- Onboards the required services: ChatGPT/OpenAI, ElevenLabs, YouTube, storage, and worker settings.
- Encrypts provider secrets before local storage.
- Validates OpenAI and ElevenLabs keys.
- Lets users provide any PostgreSQL database URL and validates the connection.
- Initializes `velvet_*` tables in PostgreSQL and syncs local records into them.
- Includes a portable PostgreSQL migration for the Velvet schema.
- Supports opt-in hosted database mirroring with `VELVET_DATABASE_MODE=postgres`.
- Generates song and album blueprints with OpenAI once setup is complete.
- Provides a project review screen for approving blueprints before paid generation.
- Lets the user edit project title, concept, generation prompts, and YouTube metadata before generation/upload.
- Auditions real generated audio in a persistent waveform transport.
- Retains per-track generation versions for A/B comparison, selection, approval, download, and targeted regeneration.
- Refines track prompts with OpenAI while preserving the original prompt and explanation in version history.
- Provides a draggable album timeline with mastering presets, gaps, fades, target loudness, runtime, and scheduled publishing.
- Imports audio and artwork references into the protected project export directory.
- Mirrors generated audio, references, manifests, and rendered video into private S3-compatible storage when server credentials are configured.
- Restores shared media automatically when Railway web and worker services do not share a local filesystem.
- Generates reviewable YouTube title and thumbnail-direction variants before they are applied.
- Stores projects, prompt versions, jobs, and upload records in a local project database.
- Records provider usage units for blueprint, music, render, and upload operations.
- Estimates provider and render costs when optional local rates are configured.
- Queues music, render, and YouTube upload jobs for a separate Velvet worker process.
- Supports durable retry, cancellation, deferred upload jobs, and recovery after worker restarts.
- Runs FFmpeg silence analysis, loudness normalization, fades, and track spacing during release rendering.
- Exports a portable JSON project archive with prompts, jobs, usage, and upload history.
- Opens Google account sign-in for YouTube, uses PKCE for the authorization code exchange, and stores refresh tokens encrypted.
- Provides backend routes for ElevenLabs music generation, render manifests, and YouTube uploads.
- Provides a fixed, no-scroll studio interface with focus mode, density controls, optional wallpaper transparency, command palette, animated loading states, and reduced-motion support.
- Protects production as a private single-user studio with a signed, HTTP-only login session.
- Schedules rendered releases for future YouTube uploads with privacy controls and cancellation.
- Tracks successful and failed uploads, success rate, privacy mix, and six-month publishing outcomes.
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
http://localhost:3000/projects/new
```

Run the worker in a second terminal when you want queued generation, render, and upload jobs to process:

```bash
npm run worker
```

For one-off local checks, process at most one queued job:

```bash
npm run worker:once
```

## Windows Desktop

Build a self-contained portable Windows executable with the Velvet server, durable worker, and FFmpeg bundled inside:

```bash
npm run desktop:dist
```

The executable is written to `release/`. Desktop projects and encrypted credentials are stored under the current Windows user's Velvet application-data directory, so replacing the executable does not remove studio data.

Use **Display options > Wallpaper mode** to reveal the Windows desktop through Velvet's translucent dark panels. The preference is stored locally and can be switched back to the solid studio background at any time.

The portable build extracts its bundled runtime on launch, so the first start can take around 30-60 seconds. Later launches are normally faster while Windows retains the extracted files.

For production worker deployment, see `docs/DEPLOYMENT.md` and `Dockerfile.worker`.

Railway is the recommended low-cost production target. The root Docker image includes FFmpeg and runs the web app plus a supervised worker in one service, allowing Velvet and Postgres to fit within Railway's entry-plan service limit.

## Available Routes

- `/projects/new` - New Media prompt entry for songs or albums
- `/projects` - empty project library
- `/publishing` - schedule rendered releases for YouTube
- `/analytics` - prior upload success, failures, and publishing trends
- `/history` - upload history and prompt archive
- `/settings` - onboarding for ChatGPT/OpenAI, ElevenLabs, YouTube login, storage, and worker setup

## Onboarding

Velvet is focused on:

- ChatGPT/OpenAI for song and album planning, prompt refinement, artwork prompts, image generation, and YouTube metadata
- ElevenLabs for music generation
- YouTube login via Google OAuth for private uploads, thumbnails, metadata, and publishing workflows

The setup UI saves keys through server routes. Secrets are encrypted with AES-GCM and stored in the gitignored `.velvet/` folder. Production deployments can set `VELVET_SECRET_PROVIDER=env` for host-provided secrets or `VELVET_SECRET_PROVIDER=vault` for a HashiCorp Vault-compatible KV v2 store.

## Upload History

The History page is designed to log every uploaded release with:

- YouTube video ID and URL
- Privacy state
- Thumbnail asset
- Render manifest
- Provider usage
- Error and retry log
- Song or album prompt
- Song or album blueprint prompt
- Track music prompts
- Cover prompt
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

Copy `.env.example` and fill in the values required by your deployment.

```bash
cp .env.example .env.local
```

Important variables include:

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `GOOGLE_CLIENT_ID`, configured once by the app owner so users can choose Log in with YouTube
- `GOOGLE_CLIENT_SECRET`, optional for public desktop clients using PKCE and required when the selected Google client type requires it
- `YOUTUBE_REDIRECT_URI` such as `http://localhost:3000/api/youtube/callback` (optional; derived from the current app address when omitted)
- `FFMPEG_PATH` optional path to `ffmpeg.exe` when FFmpeg is not on PATH
- `AWS_ENDPOINT_URL`, automatically supplied by Railway Buckets or set to another S3-compatible endpoint
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for private media storage
- `AWS_S3_BUCKET_NAME`, defaulting to `velvet-assets`
- `AWS_DEFAULT_REGION`, normally `auto` for Railway and Cloudflare R2
- `AWS_S3_URL_STYLE`, normally `virtual`
- `DATABASE_URL`
- `VELVET_DATABASE_MODE` set to `postgres` to mirror runtime records into the configured database
- `VELVET_SECRET_PROVIDER` set to `env` to read secrets from deployment environment variables
- `VELVET_SECRET_PROVIDER=vault`, `VELVET_VAULT_ADDR`, `VELVET_VAULT_TOKEN`, `VELVET_VAULT_MOUNT`, and `VELVET_VAULT_PATH` for managed Vault-backed secrets
- `VELVET_MASTER_KEY` or `TOKEN_ENCRYPTION_KEY` for deterministic local secret encryption
- `YOUTUBE_REFRESH_TOKEN` for env-backed YouTube OAuth token storage
- `VELVET_OPENAI_INPUT_PER_1M_TOKENS_USD`, `VELVET_OPENAI_OUTPUT_PER_1M_TOKENS_USD`, `VELVET_ELEVENLABS_PER_MINUTE_USD`, `VELVET_FFMPEG_PER_RENDER_MINUTE_USD`, and `VELVET_YOUTUBE_UPLOAD_PER_VIDEO_USD` for optional local cost estimates
- `VELVET_WORKER_INTERVAL_MS` polling interval for the local durable worker

## Current Limitations

- The local `.velvet/` database and media cache are intended for development and single-user desktop use.
- Long-running music, render, and upload work is queued for the worker process. Production should run the worker as a managed service/container.
- The render endpoint creates a render manifest and renders a release MP4 when FFmpeg is available.
- YouTube upload requires a real rendered MP4 path and an app-level Google OAuth client. End users connect through Google's account chooser and never enter OAuth developer credentials.
- User-provided PostgreSQL connections can be saved, validated, initialized, synced, and used as an opt-in hosted mirror.
- Shared S3-compatible storage is optional locally and required when production processes do not share durable media storage.
- Budget guardrails enforce local action limits, and cost estimates depend on user-provided rates rather than hardcoded provider pricing.
- Stem downloads appear only when a connected music provider returns stem files; ElevenLabs music generation currently supplies the rendered track used by Velvet.

## Design Direction

The interface should remain a dense, premium, midnight studio console:

- dark plum and navy surfaces
- rose, violet, and blue lighting
- editorial serif branding
- fixed no-scroll pages
- compact, purposeful controls
- no generic SaaS dashboard styling

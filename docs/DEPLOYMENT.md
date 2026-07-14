# Deployment

Velvet can run as two processes:

- Web: `npm run start`
- Worker: `npm run worker`

The worker drains persisted queued jobs for music generation, rendering and YouTube upload. In production, deploy the worker as a separate service/container with the same environment variables and database/secrets access as the web app.

## Worker Container

Build the worker image:

```bash
docker build -f Dockerfile.worker -t velvet-worker .
```

Run the worker:

```bash
docker run --env-file .env.local velvet-worker
```

The worker image installs FFmpeg so render jobs can produce MP4 exports when generated audio files are available to the container.

## Shared Requirements

Both web and worker processes need access to:

- `DATABASE_URL` when `VELVET_DATABASE_MODE=postgres`
- provider secrets through local encrypted storage, env-backed secrets, or `VELVET_SECRET_PROVIDER=vault`
- the same durable asset volume/bucket for generated audio and rendered videos
- `VELVET_WORKER_INTERVAL_MS` if the default polling cadence should change

## Railway

Recommended Railway layout:

- Service 1: `velvet-web`
  - Source: GitHub repo
  - Build command: `npm run build`
  - Start command: `npm run start:railway`
  - Health check path: `/dashboard`
- Service 2: `velvet-worker`
  - Source: same GitHub repo
  - Build command: `npm run build`
  - Start command: `npm run worker`
- Plugin/service: Postgres
  - Set `VELVET_DATABASE_MODE=postgres`
  - Use Railway's `DATABASE_URL`

The checked-in `railway.json` config is for the web service. In the Railway dashboard, create the worker as a second service from the same repo and override its start command to `npm run worker`.

Railway variables to set on both web and worker:

- `VELVET_DATABASE_MODE=postgres`
- `VELVET_SECRET_PROVIDER=env`
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `YOUTUBE_REDIRECT_URI`
- `YOUTUBE_REFRESH_TOKEN` after OAuth is completed or migrated
- `FFMPEG_PATH=ffmpeg`
- optional `VELVET_*_USD` cost estimate rates

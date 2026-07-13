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

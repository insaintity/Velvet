# Deployment

Velvet runs a Next.js web process and a durable worker. Railway's root Docker image includes FFmpeg and supervises both processes in one service. Larger deployments can use `Dockerfile.worker` and `railway.worker.json` to run the worker independently.

## Railway Layout

Recommended private single-user layout:

- `Velvet`: GitHub service using the root `Dockerfile`
- `Postgres`: Railway PostgreSQL service for durable records
- `velvet-assets`: private Railway Storage Bucket for audio, artwork, manifests, and rendered video

Configure the Velvet service with:

- `VELVET_ADMIN_USERNAME` (optional; defaults to `velvet` for a fresh private studio)
- `VELVET_ADMIN_EMAIL` (optional; when set, login email must match this account)
- `VELVET_ADMIN_PASSWORD` (optional; defaults to `Enter` for a fresh private studio)
- `VELVET_SESSION_SECRET`
- `VELVET_DATABASE_MODE=postgres`
- `VELVET_SECRET_PROVIDER=env`
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `YOUTUBE_REDIRECT_URI`
- `YOUTUBE_REFRESH_TOKEN` after OAuth is completed or migrated
- `FFMPEG_PATH=ffmpeg`
- optional `VELVET_*_USD` cost-estimate rates

Create a Railway Bucket in the same project and use its credential injection action on the Velvet service. Velvet reads Railway's standard values automatically:

- `AWS_ENDPOINT_URL`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET_NAME`
- `AWS_DEFAULT_REGION`
- `AWS_S3_URL_STYLE`

No bucket credentials need to be entered in Velvet Settings when those variables are present. Saving Setup automatically validates the injected database and bucket connections.

## Other S3 Providers

The media adapter supports S3-compatible services such as Cloudflare R2, Backblaze B2, MinIO, and AWS S3. Set the same `AWS_*` variables manually or enter the endpoint, region, bucket, access key, and secret key in Velvet's advanced setup screen.

Railway and Cloudflare R2 normally use `AWS_DEFAULT_REGION=auto` and `AWS_S3_URL_STYLE=virtual`. Path-style MinIO deployments can use `AWS_S3_URL_STYLE=path`.

Media remains private. Browser playback is proxied through Velvet, while generated tracks, reference assets, render manifests, and MP4 files use stable object keys. Local files remain a desktop and development cache.

## Separate Worker

Build the worker image:

```bash
docker build -f Dockerfile.worker -t velvet-worker .
```

Run it locally:

```bash
docker run --env-file .env.local velvet-worker
```

For independent Railway scaling, create a second service from the same repository, select `railway.worker.json`, and give both services the same `DATABASE_URL`, provider secrets, and bucket variables. Change the web service start command to `npm run start:railway`.

## Persistence Rules

- PostgreSQL stores projects, prompts, jobs, uploads, and usage records.
- S3-compatible storage holds generated and uploaded binary media.
- The local `.velvet` directory is a cache and offline fallback, not the production source of truth.
- Back up PostgreSQL and the private bucket independently.

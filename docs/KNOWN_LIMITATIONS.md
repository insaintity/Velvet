# Known Limitations

- The app intentionally opens with no projects or seeded demo albums.
- Local persistence uses `.velvet/db.json`, and hosted Postgres mode merges local/hosted records with newest-record conflict handling.
- Supabase/Postgres database URLs can be saved, validated, initialized, synced, and used as an opt-in hosted primary/fallback pair.
- Secrets are encrypted locally by default. Production can also read from environment-backed secrets or a HashiCorp Vault-compatible KV v2 store.
- Job records are persisted and the worker can process queued music, render and upload work. Production should run the provided worker container in a managed runtime.
- ElevenLabs music generation depends on the live provider endpoint and a valid key.
- The render endpoint creates a manifest and renders full-album MP4 composition when FFmpeg is available.
- YouTube upload is implemented as an API endpoint, but requires a real MP4 export path and configured OAuth credentials.
- Usage units are recorded and local action limits are enforced. Cost estimates require user-provided rates because provider pricing varies by plan and can change.

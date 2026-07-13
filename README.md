# Velvet Coda

AI album foundry for planning, producing, rendering and publishing complete jazz albums.

Phase 1 is a polished first-launch studio shell. It keeps the Velvet Coda dashboard direction, but opens as a clean new workspace with no seeded album, fake jobs or fake provider activity.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000/dashboard`.

## Current Phase

- Next.js App Router, React, strict TypeScript and Tailwind CSS
- Velvet Coda visual system with dark plum/navy panels, rose/violet/blue lighting and editorial serif branding
- Permanent sidebar, top project bar and bottom audio player
- First-run dashboard with setup guidance and a single clear album creation path
- Focused onboarding for ChatGPT/OpenAI, ElevenLabs, YouTube, storage and worker setup
- New project brief flow at `/projects/new`
- Empty projects and disabled player states until real albums exist
- Zustand-powered player shell state

## Provider State

Provider credentials are not connected in Phase 1. The interface shows empty and not-connected states, and it never claims that ChatGPT/OpenAI, ElevenLabs, image tools, FFmpeg or YouTube work has happened.

# History Game Documentation

Welcome to the **History Game** documentation! This folder contains all technical and architectural documentation for the project.

## Table of Contents

| Document | Description |
|----------|-------------|
| [architecture.md](./architecture.md) | System architecture, data flows, database schema |
| [api.md](./api.md) | API endpoints, request/response formats |
| [setup.md](./setup.md) | Local development setup and environment variables |

## Project Overview

**History Game** is a multiplayer history trivia game built with [Next.js](https://nextjs.org). Players compete in real-time to identify which of two historical events occurred earlier.

### Features

- **Single-player mode** — practice against the clock
- **Multiplayer mode** — real-time 1v1 matches with lobby, room codes, and live scoring
- **Event filtering** — filter by year range, region, and country
- **Live updates** — powered by Supabase Realtime
- **Language support** — English, Czech, Italian (extensible via DeepL)
- **Fun facts** — learn something new after each round
- **Disconnect detection** — server-side heartbeats detect opponent dropouts

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

See [setup.md](./setup.md) for full configuration details.

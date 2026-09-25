# Higher or Lower Games — Documentation

Welcome to the **Higher or Lower Games** documentation! This folder contains all technical and architectural documentation for the project.

## Table of Contents

| Document | Description |
|----------|-------------|
| [architecture.md](./architecture.md) | System architecture, data flows, database schema, game registry |
| [api.md](./api.md) | API endpoints, request/response formats |

## Project Overview

**Higher or Lower Games** is a multi-game quiz platform built with [Next.js](https://nextjs.org). Players pick between two things — which one is "lower" or "higher" — across different games, in single-player or real-time multiplayer.

### Games

| Game | Question | Dataset |
|------|----------|---------|
| **History** | Which event happened earlier? | ~200 historical events |
| **Mountains** | Which mountain is higher? | ~206 world peaks |
| **Rivers** | Which river is longer? | ~200 world rivers |

New games are added by creating one entry in the game registry (`lib/games.js`) plus one data table — all pages, APIs and components are shared.

### Features

- **Homescreen** — pick single/multiplayer, then pick a game
- **Single-player mode** — solo streaks with ranks and milestones (win at streak 50)
- **Multiplayer mode** — real-time matches with lobby, room codes, and live scoring (2-10 players)
- **Live updates** — powered by Supabase Realtime
- **Language support** — English, Czech, Italian (extensible via DeepL)
- **Fun facts** — learn something new after each round
- **Disconnect detection** — server-side heartbeats detect player dropouts
- **Per-game filters** — year/region/country for history, elevation/region/country for mountains, length/region/country for rivers

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.
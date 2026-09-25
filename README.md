# Higher or Lower Games

A multi-game quiz platform built with [Next.js](https://nextjs.org). Players pick between two things — which one is "lower" or "higher" — across different games, in single-player or real-time multiplayer.

| Game | Question | Dataset |
|------|----------|---------|
| 🏛️ **History** | Which event happened earlier? | ~200 historical events |
| 🏔️ **Mountains** | Which mountain is higher? | ~206 world peaks |
| 💧 **Rivers** | Which river is longer? | ~200 world rivers |

## Features

- **Homescreen** — pick single/multiplayer, then pick a game
- **Single-player mode** — solo streaks with ranks and milestones (win at streak 50)
- **Multiplayer mode** — real-time matches with lobby, room codes, and live scoring (2–10 players)
- **Live updates** — powered by Supabase Realtime
- **Language support** — English, Czech, Italian (extensible via DeepL)
- **Fun facts** — learn something new after each round
- **Per-game filters** — year/region/country (history), elevation/region/country (mountains), length/region/country (rivers)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server (needs .env.local with public Supabase keys)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

```bash
npm run lint       # eslint
npm run test:run   # vitest unit tests
npm run build      # next build (must have env vars set)
```

## Environment Variables

| Variable | Scope |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | public |
| `NEXT_PUBLIC_SUPABASE_KEY` | public (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** — server-side only |
| `DEEPL_API_KEY` | **secret** — server-side only |

Never commit secrets. `.env*` is gitignored; the two secret keys live in the Vercel dashboard.

## Documentation

- [docs/architecture.md](./docs/architecture.md) — system architecture, data flows, database schema, game registry
- [docs/api.md](./docs/api.md) — API endpoints, request/response formats
- [AGENTS.md](./AGENTS.md) — conventions for AI agents working on this repo

## Deployment

Production deploys automatically on every push to `main` via [Vercel](https://vercel.com).

## Adding a New Game

1. Add an entry to `GAMES` in `lib/games.js` (mechanics + data tables + filter keys)
2. Add `SP_UI.<key>` and `MP_UI.<key>` dictionaries in `lib/gameUi.js` (all langs, same keys)
3. Create the data + translations tables in Supabase (mirror `database/18_create_rivers.sql`)
4. Add the game to `getStaticPaths` in both `pages/play/[game]/` routes and to `GAMES_META` in `pages/index.js`
5. Seed data via a batch file + `scripts/seed-rivers.js`-style script (or extend it)
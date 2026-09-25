# AGENTS.md — Higher or Lower Games

## Project overview
- **Stack**: Next.js 16 (Pages Router), React 19, Supabase JS client, DeepL translation API
- **Multi-game quiz platform**: pick between two things — earlier (history), higher (mountains) or longer (rivers) — single-player or real-time multiplayer
- **Game registry**: `lib/games.js` describes every game (mechanics, tables, filters); pages/components/APIs are shared and game-agnostic
- **Deployed on Vercel** with connected GitHub repo `prokopHouda/history_game`
- **Local source folder**: `C:\Users\proko\Documents\GitHub\history_game`

## Entry points & architecture
- **Homescreen**: `pages/index.js` — two-step wizard (single/multiplayer → game)
- **Game routes (SSG)**: `pages/play/[game]/index.js` + `pages/play/[game]/multiplayer.js` — thin wrappers over `components/SinglePlayerGame.js` / `components/MultiplayerGame.js` (both take `game` prop)
- **Old URL** `/multiplayer` redirects (308) to `/play/history/multiplayer` via `next.config.mjs`
- **API**: `pages/api/room.js` (create/join/lifecycle), `pages/api/turn.js` (validate turn + next pair), `pages/api/finish.js`, `pages/api/translate.js` (DeepL proxy + cache) — all game-aware via `rooms.game` / `game` param
- **Styling**: `styles/globals.css` glassmorphism / gradient theme (Inter font)

### Multiplayer architecture (Supabase Realtime)
- Players create/join rooms via `POST /api/room` (3-letter room code, `game` param)
- Room state stored in `rooms` table with realtime enabled via `postgres_changes`
- Client subscribes to `supabase.channel("room:{code}")` for instant sync
- Both players answer individually; when all answered, system auto-generates next pair via `pickPair` (proximity-weighted + deduplication, game-aware gaps)
- Win condition: highest score after `total_rounds` rounds (5–50)
- Realtime WebSocket used instead of polling; free tier supports 200 concurrent connections

## Data model (Supabase)
- **`events` table**: `id, short_name, date, year, description, countries, region`
  - `id` is **not auto-increment** — explicit value required on insert
  - `year` is an **integer** column (not text)
  - `year_int` is a **generated column** derived from `year` — never write to it
  - `date` is a real `date` type (nullable); most rows leave it `null`
- **`event_translations` table**: `event_id, lang, short_name, description, fun_fact, updated_at` — populated lazily via `/api/translate`
  - Unique constraint on `(event_id, lang)` — no duplicate translations
  - FK to `events(id)` with `ON DELETE CASCADE` — orphans auto-cleaned
  - `updated_at` auto-updates on row change (trigger) — available for future cache TTL logic
- **`mountains` table**: `id, short_name, elevation (int), description, countries, range, region, fun_fact` — mirrors `events` (migrations `database/15_create_mountains.sql`, `database/17_add_mountains_region.sql`; RLS: public read on `mountains`, translations service-only). `region` uses the same UN M49 sub-regions as `events.region`; `range` (mountain range) is kept as data but no longer a filter.
- **`mountain_translations` table**: `mountain_id, lang, short_name, description, fun_fact, updated_at` — mirrors `event_translations`
- **`rivers` table**: `id, short_name, length (int, km), description, countries, region, fun_fact` — mirrors `events`/`mountains` (migration `database/18_create_rivers.sql`; RLS: public read on `rivers`, translations service-only). `region` uses the same UN M49 sub-regions.
- **`river_translations` table**: `river_id, lang, short_name, description, fun_fact, updated_at` — mirrors `event_translations`
- **`rooms` table** (multiplayer): `id, code, game, host, state, events (pool JSONB), current_pair, scores, streaks, current_round, answered, winner, shown_pairs, heartbeats, created_at/updated_at`
  - `game`: `'history'` (default), `'mountains'` or `'rivers'` — set at create, read by turn/translate logic
  - Migrations: `database/00_create_rooms.sql`, `database/16_add_rooms_game.sql` — run manually in Supabase SQL Editor
  - `shown_pairs`: JSONB array of canonical pair keys (`"a-b"`) preventing repeat questions
  - `heartbeats`: JSONB tracking last-seen timestamps per player for disconnect detection
  - Realtime enabled via: `alter publication supabase_realtime add table rooms;`

## Game mechanics config (`lib/games.js`)
| | history | mountains | rivers |
|---|---|---|---|
| Question | Which happened earlier? | Which is higher? | Which is longer? |
| Winner | lower `getComparable` | higher `getComparable` | higher `getComparable` |
| minGap (never paired) | 2 years | 50 m | 10 km |
| easyGap (+1 / +2 below) | 100 years | 500 m | 100 km |
| gapScale (weight decay) | 50 | 500 | 500 |
| Filter keys | `startYear`/`endYear`, `region`, `country` | `minElevation`/`maxElevation`, `region`, `country` | `minLength`/`maxLength`, `region`, `country` |
| UI dicts | `SP_UI.history` / `MP_UI.history` in `lib/gameUi.js` | `SP_UI.mountains` / `MP_UI.mountains` | `SP_UI.rivers` / `MP_UI.rivers` |

## Environment variables
| Variable | Scope | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Used in browser + API route |
| `NEXT_PUBLIC_SUPABASE_KEY` | public | Publishable key (anon), used in browser |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** | Server-side only; used in `/api/translate` for writes |
| `DEEPL_API_KEY` | **secret** | Server-side only; used in `/api/translate` fallback |

**Critical**: `.env.local` is gitignored. The repo's `.env.local` only contains public keys. The two secret keys must live in Vercel dashboard → Project Settings → Environment Variables. The public keys are also there for production.

## Translation flow
1. Game UI requests `/api/translate?ids=...&lang=...&game=...`
2. API checks the game's translations table cache first (`event_translations` / `mountain_translations` / `river_translations`)
3. Missing texts are sent to DeepL (`api-free.deepl.com`), translated from EN → target
4. New translations are **upserted back** into the game's translations table
5. Graceful fallback to English if DeepL fails or key is missing

## Running locally
```bash
npm run dev      # localhost:3000
npm run lint     # eslint
npm run build    # next build (must have env vars set)
```

## Build / deploy
- Dev server: `npm run dev` (needs `.env.local` with public keys)
- Production: push to `main` branch on GitHub → Vercel auto-deploys
- Never deploy via Vercel CLI — always through GitHub (see `.opencode/skills/deployment-history-game`)

## i18n
Built-in languages: `en`, `cs`, `it`. Language stored in `localStorage('gameLang')`, defaults to `en`.
Per-game UI dictionaries live in `lib/gameUi.js` (`SP_UI`, `MP_UI` — key parity across languages enforced by tests). Item data is translated via `/api/translate`. Country names in filter dropdowns are localized via `Intl.DisplayNames` (`lib/countries.js`); country codes remain ISO-2 in the data.

## Adding a new game
1. Add an entry to `GAMES` in `lib/games.js` (mechanics + data tables + filter keys)
2. Add `SP_UI.<key>` and `MP_UI.<key>` dictionaries in `lib/gameUi.js` (all langs, same keys)
3. Create the data + translations tables in Supabase (mirror `database/15_create_mountains.sql`)
4. Add the game to `getStaticPaths` in both `pages/play/[game]/` routes and to `GAMES_META` in `pages/index.js`
5. Seed data via a batch file + `scripts/seed-mountains.js`-style script (or extend it)

## Important conventions
- **Never** commit secrets. `.env*` is gitignored. Only public keys in `.env.local`.
- Single-player and multiplayer engines live in `components/SinglePlayerGame.js` / `components/MultiplayerGame.js` and are game-agnostic. Multiplayer uses `useRef` for flow-control variables and `useEffect` for realtime subscriptions, heartbeat intervals, and turn timers.
- The `events` and `event_translations` tables are managed in Supabase dashboard; seed scripts for new data live in `scripts/` (events-data / mountains-data / rivers-data batch files).
- Wire keys `earlier`/`later` in `/api/turn` responses mean "correct answer"/"wrong answer" regardless of game direction — kept for compatibility.


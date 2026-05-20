# AGENTS.md — History Quiz Game

## Project overview
- **Stack**: Next.js 16 (Pages Router), React 19, Supabase JS client, DeepL translation API
- **Single-page game**: All UI logic lives in `pages/index.js` (client-side `useEffect` + DOM manipulation)
- **Deployed on Vercel** with connected GitHub repo `prokopHouda/history_game`
- **Local source folder**: `C:\Users\proko\history-game` (NOT `Documents\history_game`)

## Entry points & architecture
- **App entry**: `pages/index.js` — quiz game UI, filters, scoring, streaks, i18n, translations
- **API entry**: `pages/api/translate.js` — fetches cached translations from Supabase; falls back to DeepL; stores new translations back to `event_translations`
- **App shell**: standard `_app.js`, `_document.js`
- **Styling**: CSS Modules (`Home.module.css`) + `globals.css` with glassmorphism / gradient theme (Inter font via Google Fonts)

## Data model (Supabase)
- **`events` table**: `id, short_name, date, year, description, countries, region`
- **`event_translations` table**: `event_id, lang, short_name, description` — populated lazily via `/api/translate`
- Game requires at least 25 matching events to start

## Environment variables
| Variable | Scope | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Used in browser + API route |
| `NEXT_PUBLIC_SUPABASE_KEY` | public | Publishable key (anon), used in browser |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** | Server-side only; used in `/api/translate` for writes |
| `DEEPL_API_KEY` | **secret** | Server-side only; used in `/api/translate` fallback |

**Critical**: `.env.local` is gitignored. The repo's `.env.local` only contains public keys. The two secret keys must live in Vercel dashboard → Project Settings → Environment Variables. The public keys are also there for production.

## Translation flow
1. Game UI requests `/api/translate?ids=...&lang=...`
2. API checks `event_translations` cache first
3. Missing texts are sent to DeepL (`api-free.deepl.com`), translated from EN → target
4. New translations are **inserted back** into `event_translations`
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
- Manual Vercel deploy: `vercel --prod`

## i18n
Built-in languages: `en`, `cs`, `it`. Language stored in `localStorage('gameLang')`, defaults to `en`.
Static UI strings are inline in `pages/index.js`. Event data is translated via `/api/translate`.

## Important conventions
- **Never** commit secrets. `.env*` is gitignored. Only public keys in `.env.local`.
- The game uses **raw DOM manipulation** inside a `useEffect` (not React state). Changing it to React state would require a significant refactor.
- The `events` and `event_translations` tables are managed in Supabase dashboard; no migrations or seed scripts exist in the repo.


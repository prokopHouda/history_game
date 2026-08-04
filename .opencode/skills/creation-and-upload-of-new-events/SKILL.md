---
name: creation-and-upload-of-new-events
description: |
  Use this skill when the user asks to add, create, generate, or insert new historical events into the history_game Supabase database, and then upload them.
  The user can simply state a count and optionally a region/country/timeframe, e.g. "add 10 events about African history" or "generate 5 events from the 1800s".
  This skill handles the full pipeline: research events, dedupe against existing rows, propose for approval, insert into Supabase, verify, save a batch file, and commit it to GitHub.
  NEVER insert duplicate events — always query existing `short_name` values first and skip any that already exist.
  Replaces the older `generate-new-events` skill, which had inaccurate region values.
---

# Creation & Upload of New Events — history_game

## What this skill does

Adds new historical events to the `events` table in Supabase and commits a reusable batch file to GitHub. Full pipeline:

1. Get the Supabase secret key from the user (anon key will NOT work)
2. Query existing events to find the max id and the full set of existing `short_name` values
3. Research and propose candidate events fitting the user's scope
4. Dedupe proposed `short_name` values against existing rows; replace any collisions
5. Present the final list to the user for approval
6. Insert via the Supabase REST API with explicit sequential ids (max+1, max+2, ...)
7. Verify the inserted rows
8. Save a reusable batch file under `scripts/events-data/`
9. Commit and push to GitHub `main` (triggers Vercel auto-deploy)
10. Remind the user to rotate the secret key if it was pasted in chat

## Invocation

The user can simply write a natural-language request, for example:

- "add 10 events"
- "generate 5 events about African history"
- "insert 8 events from the 1800s in Europe"
- "create 12 Asian events before 1500"
- "prepare new 20 events" (the exact phrasing of the session this skill was extracted from)

Parse the request for:
- **count** (required) — how many events to add
- **region / countries** (optional) — e.g. Africa, Asia, Europe, China, Japan
- **timeframe** (optional) — e.g. "1800s", "before 1500", "20th century", "ancient"
- **theme** (optional) — e.g. "science", "wars", "exploration"
- **constraints** (optional) — e.g. "no BC events", "only AD", "post-1900"

When the user says a country name (e.g. "China", "Japan"), map it to its **ISO 3166-1 alpha-2 code** (`CN`, `JP`) for the `countries` column. The user speaks in country names; the database stores codes.

If the user gives only a count with no scope, pick a region/era that broadens coverage. Query `events` first to see which regions/eras are underrepresented, then propose events that fill gaps.

## ⚠️ Critical Rule — NEVER add duplicate events

**Before generating any events, query the existing `events` table and check the candidate `short_name` values against existing rows.** Skip any event whose `short_name` already exists. This is non-negotiable.

The dedupe check uses the `short_name` column (case-sensitive, exact match). Query all existing names first, then only propose events whose names are NOT in that set. Also check conceptually — if "Charlemagne Crowned Emperor" exists, do not propose it under a slightly different name.

## Supabase connection

- **Project URL**: `https://wsxnspagxjitesktltev.supabase.co`
- **REST base**: `https://wsxnspagxjitesktltev.supabase.co/rest/v1`
- **Auth key**: the user's Supabase **secret API key** (new name for the old `service_role` key). It starts with `sb_secret_...`. The publishable/anon key (`sb_publishable_...` or a JWT with `"role":"anon"`) will NOT work for inserts — RLS blocks it. If the user pastes the anon key by mistake, ask again for the secret key.

### Required request headers (Windows PowerShell gotcha)

PowerShell's default `User-Agent` makes Supabase reject secret-key requests with `401 "Forbidden use of secret API key in browser"`. Always override the User-Agent to a server-like value:

```powershell
$hdr = @{
  "apikey"        = $secretKey
  "Authorization" = "Bearer $secretKey"
  "User-Agent"    = "node-fetch/seed-script"
  "X-Client-Info" = "supabase-js/2.105.4"
}
```

## `events` table schema (hard-won, do not guess)

| column        | type         | required on insert | notes |
|---------------|--------------|--------------------|-------|
| `id`          | integer      | **yes**            | **NOT auto-increment**. Must be an explicit integer. Find current max id (`?select=id&order=id.desc&limit=1`) and use max+1, max+2, ... |
| `short_name`  | text         | **yes**            | English title, used for dedupe. Keep it unique and descriptive. |
| `year`        | integer      | **yes**            | **Integer, not text.** e.g. `618`, not `"618"`. |
| `description` | text         | **yes**            | English description (1-3 sentences). |
| `countries`   | text         | recommended        | **Comma-separated ISO 3166-1 alpha-2 codes (UPPERCASE)**, e.g. `"CN, MN"` — NOT full country names. Drives the country filter. See code table below. |
| `region`      | text         | recommended        | **UN M49 subregion string**, e.g. `Eastern Asia`, `Western Europe`, `Northern Africa`. See the canonical list below. Drives the region filter. |
| `fun_fact`    | text         | recommended        | Short trivia shown after a correct answer. Improves player experience. |
| `year_int`    | integer      | **never insert**   | **Generated column** derived from `year`. Writing it throws `428C9: cannot insert a non-DEFAULT value into column "year_int"`. |
| `date`        | date (real)  | optional           | Real SQL `date` type, **nullable**. Strings like `"618 AD"` throw `22007: invalid input syntax for type date`. Most existing rows leave it `null`. Omit it unless you have a precise ISO date (`YYYY-MM-DD`). |

### `region` — UN M49 subregions (use these exact strings)

The existing batches use **UN M49 subregion names**, not the 6-continent values the older skill listed. Match the existing methodology. Canonical values found in the live DB:

- **Europe**: `Northern Europe`, `Western Europe`, `Southern Europe`, `Eastern Europe`
- **Asia**: `Eastern Asia`, `Western Asia`, `Southern Asia`, `South-Eastern Asia`, `Central Asia`
- **Africa**: `Northern Africa`, `Western Africa`, `Eastern Africa`, `Middle Africa`, `Southern Africa`
- **Americas**: `Northern America`, `South America`, `Central America`, `Caribbean`
- **Oceania**: `Australia & New Zealand`, `Melanesia`, `Polynesia`, `Micronesia`
- For multi-region events, use a comma-separated string e.g. `"Northern America, Northern Europe"` (see the Ryder Cup row in `sport-batch.js`).

When unsure which subregion a country belongs to, query the DB: `?select=region&countries=like.*XX*&order=year.desc&limit=5` and follow the existing convention for that country.

### Minimal valid insert payload

```json
{
  "id": 511,
  "short_name": "Tang Dynasty Established",
  "year": 618,
  "description": "The Tang dynasty is founded...",
  "countries": "CN",
  "region": "Eastern Asia",
  "fun_fact": "Chang'an was likely the largest city in the world..."
}
```

### `countries` — ISO 3166-1 alpha-2 codes (UPPERCASE, comma-separated)

**Never use full country names.** The `countries` column stores comma-separated ISO alpha-2 codes in uppercase, e.g. `"CN, MN"`. This drives the in-game country filter. Common codes you'll likely need:

| Country | Code | | Country | Code | | Country | Code |
|---------|------|---|---------|------|---|---------|------|
| China | `CN` | | Japan | `JP` | | India | `IN` |
| Korea (North/South) | `KR` | | Mongolia | `MN` | | Iran | `IR` |
| Philippines | `PH` | | Pakistan | `PK` | | Indonesia | `ID` |
| Vietnam | `VN` | | Thailand | `TH` | | Cambodia | `KH` |
| Laos | `LA` | | Myanmar | `MM` | | Malaysia | `MY` |
| Singapore | `SG` | | Timor-Leste | `TL` | | Bangladesh | `BD` |
| Sri Lanka | `LK` | | Nepal | `NP` | | Afghanistan | `AF` |
| Iraq | `IQ` | | Turkey | `TR` | | Saudi Arabia | `SA` |
| Israel | `IL` | | Egypt | `EG` | | Ethiopia | `ET` |
| South Africa | `ZA` | | Nigeria | `NG` | | Kenya | `KE` |
| Morocco | `MA` | | Ghana | `GH` | | Tunisia | `TN` |
| Algeria | `DZ` | | Tanzania | `TZ` | | Cameroon | `CM` |
| Mali | `ML` | | Sudan | `SD` | | Madagascar | `MG` |
| USA | `US` | | Canada | `CA` | | Mexico | `MX` |
| Brazil | `BR` | | Argentina | `AR` | | Chile | `CL` |
| Colombia | `CO` | | Peru | `PE` | | Cuba | `CU` |
| Haiti | `HT` | | Bahamas | `BS` | | Jamaica | `JM` |
| Uruguay | `UY` | | UK | `GB` | | France | `FR` |
| Germany | `DE` | | Italy | `IT` | | Spain | `ES` |
| Portugal | `PT` | | Netherlands | `NL` | | Belgium | `BE` |
| Switzerland | `CH` | | Austria | `AT` | | Poland | `PL` |
| Russia | `RU` | | Czechia | `CZ` | | Slovakia | `SK` |
| Hungary | `HU` | | Croatia | `HR` | | Serbia | `RS` |
| Bosnia | `BA` | | Montenegro | `ME` | | Slovenia | `SI` |
| Lithuania | `LT` | | Ireland | `IE` | | Denmark | `DK` |
| Sweden | `SE` | | Norway | `NO` | | Finland | `FI` |
| Greece | `GR` | | Romania | `RO` | | Bulgaria | `BG` |
| Ukraine | `UA` | | Australia | `AU` | | New Zealand | `NZ` |

For countries not in this table, look up the ISO 3166-1 alpha-2 code before generating the payload. Use the official code in uppercase. Multi-country events use comma-separated codes: `"CN, MN"`, `"IN, PK"`, `"CZ, SK"`.

## Translations are automatic — do NOT insert them

The `event_translations` table is populated lazily by `/api/translate` (DeepL) the first time a player views an event in `cs` or `it`. Adding English source rows is enough. Never manually insert translations.

## Full workflow

### 1. Ask for the secret key (if not already in context)

If you don't already have `sb_secret_...` in this session, ask the user to paste it. If the user pastes a JWT or `sb_publishable_...` key, decode/inspect it — if the payload has `"role":"anon"`, ask again for the secret key. The anon key will NOT work for inserts — RLS blocks it.

### 2. Query existing events to inform generation

```powershell
# Get current max id
$url = "https://wsxnspagxjitesktltev.supabase.co/rest/v1/events?select=id&order=id.desc&limit=1"
$r = Invoke-RestMethod -Uri $url -Headers $hdr -Method Get
$maxId = $r[0].id

# Get ALL existing short_name values (for global dedupe — events can match across regions)
$url = "https://wsxnspagxjitesktltev.supabase.co/rest/v1/events?select=short_name"
$existing = (Invoke-RestMethod -Uri $url -Headers $hdr -Method Get).short_name
```

Always pull **all** `short_name` values, not just one region — cross-region duplicates happen (e.g. "Charlemagne Crowned Emperor" was in the Germany batch even though the event is Italian).

### 3. Research and propose the events

Generate `count` candidate events fitting the user's scope. For each event, provide:
- `short_name` — must NOT match any existing `short_name`
- `year` — integer
- `description` — factual, 1-3 sentences
- `countries` — **comma-separated ISO 3166-1 alpha-2 codes (UPPERCASE)**, e.g. `"CN, MN"`. Never full country names. See the code table above.
- `region` — **UN M49 subregion** string (e.g. `Eastern Asia`, `Western Europe`, `Northern Africa`). See the canonical list above.
- `fun_fact` — short trivia

**Dedupe pass**: compare every proposed `short_name` against the existing set. For any collision, swap in a replacement event (preferably from an underrepresented region). Also check conceptual duplicates — if "Magna Carta Sealed" exists, don't propose it again.

**Present the final list to the user for approval before inserting.** Use a markdown table (id, short_name, year, countries, region, description, fun_fact) so it's easy to review/edit. The user may remove rows, edit text, or ask for replacements. If you swapped any rows after the dedupe pass, show a separate "replacements" table explaining what was swapped and why.

### 4. Insert via the Supabase REST API

Once approved, build the payload array and POST. Assign sequential ids starting at `maxId + 1`.

```powershell
$hdr = @{
  "apikey"        = $secretKey
  "Authorization" = "Bearer $secretKey"
  "User-Agent"    = "node-fetch/seed-script"
  "X-Client-Info" = "supabase-js/2.105.4"
  "Prefer"        = "return=representation"
}
$body = @(
  @{ id=572; short_name="..."; year=330; description="..."; countries="TR"; region="Western Asia"; fun_fact="..." },
  # ...
)
$json = $body | ConvertTo-Json -Compress
$url = "https://wsxnspagxjitesktltev.supabase.co/rest/v1/events?select=id,short_name,year,year_int,countries,region"
$r = Invoke-RestMethod -Uri $url -Headers $hdr -Method Post -Body $json -ContentType "application/json"
$r | Format-Table -AutoSize
```

**Do not include `year_int` or `date` in the payload.** They will cause 400 errors.

### 5. Verify the insert

The `Prefer: return=representation` header makes the POST return the inserted rows. Confirm:
- Row count matches the number of events
- `id`, `short_name`, `year` match the payload
- `year_int` was auto-generated correctly (equals `year`)

If any row is missing or `year_int` is null, query back by id and investigate.

### 6. Save the batch file

Write the inserted events (with the corrected schema — `year` as int, no `year_int`, no `date`, explicit `id`) to a new data file under `scripts/events-data/`. Name it after the theme, e.g. `scripts/events-data/world-history-batch.js`:

```javascript
export const worldHistoryBatch = [
  { id: 572, short_name: "...", year: 330, description: "...", countries: "TR", region: "Western Asia", fun_fact: "..." },
  // ...
];
```

Use a named export (`const <theme>Batch = [...]`) so `scripts/seed-events.js` can pick it up. Match the exact formatting of existing batch files (2-space indent, string keys, trailing commas).

### 7. Commit to GitHub

Follow the `deployment-history-game` skill's commit workflow. Use the bundled git from GitHub Desktop (git is not on PATH on this machine):

```powershell
$git = (Get-ChildItem "C:\Users\proko\AppData\Local\GitHubDesktop" -Recurse -Filter git.exe -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
& $git -C "C:\Users\proko\Documents\GitHub\history_game" add scripts/events-data/<theme>-batch.js
& $git -C "C:\Users\proko\Documents\GitHub\history_game" commit -m "chore: add <theme> event batch (<count> events)"
& $git -C "C:\Users\proko\Documents\GitHub\history_game" push origin main
```

Only commit the new batch file. Do not commit `AGENTS.md` or other unrelated changes unless they're directly relevant. The `scripts/seed-events.js` script already exists and is reusable — no need to modify it. Never run `vercel` CLI directly — Vercel auto-deploys from GitHub `main`.

### 8. Remind the user to rotate the secret key

If the user pasted the secret key in chat, remind them to rotate it in Supabase Dashboard → Settings → API → roll secret, then update the Vercel env var `SUPABASE_SERVICE_ROLE_KEY`.

## Error reference (from real failures in this project)

| HTTP | code   | cause | fix |
|------|--------|-------|-----|
| 401  | —      | Default PowerShell User-Agent looks like a browser | Set `User-Agent: node-fetch/seed-script` header |
| 401  | —      | Used anon/publishable key for insert | Ask user for the `sb_secret_...` key |
| 400  | `428C9` | Tried to insert `year_int` | Remove `year_int` from payload — it's a generated column |
| 400  | `22007` | `date` value like `"618 AD"` is not a valid SQL date | Omit `date`, or use ISO `YYYY-MM-DD` |
| 400  | `23502` | Missing `id` | `id` is NOT auto-increment — supply an explicit integer |
| 400  | `400`  | `short_name=in.(...)` filter with bad encoding | Use `encodeURIComponent` on each name, join with `,` inside `in.(...)` |
| 409  | `23505` | Duplicate `short_name` violated unique constraint | Run the dedupe pass again; the name already exists |

## Existing reusable tooling

- **`scripts/seed-events.js`** — dependency-free Node script (uses built-in `fetch`, no `@supabase/supabase-js` import). Dedupes by `short_name`, inserts via REST, reports inserted ids. Run with: `SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed-events.js scripts/events-data/<batch>.js`. Requires Node on PATH (not always present on this machine — fall back to PowerShell `Invoke-RestMethod` if `node` is missing).
- **`scripts/events-data/asia-batch.js`** — example batch file, 11 events (ids 511-521). Use as the template for new batch files.
- **`scripts/events-data/sport-batch.js`** — 50 sport events (ids 522-571), demonstrates multi-region comma syntax (`"Northern America, Northern Europe"`).
- **`scripts/events-data/world-history-batch.js`** — 20 world-history events (ids 572-591), demonstrates the dedupe-and-replace workflow where 6 collisions were swapped for underrepresented-region events.

## Summary checklist

- [ ] Secret key obtained (or already in context) — verified to be `sb_secret_...`, not anon
- [ ] Queried existing `short_name` values (all regions, for global dedupe)
- [ ] Queried current max id for sequential id assignment
- [ ] Proposed events presented to user for approval in a markdown table
- [ ] Dedupe pass completed; any collisions replaced and replacements noted
- [ ] No `short_name` duplicates with existing rows
- [ ] `countries` uses ISO 3166-1 alpha-2 codes (UPPERCASE), not full country names
- [ ] `region` uses UN M49 subregion strings (e.g. `Eastern Asia`, not `Asia`)
- [ ] Payload uses `year` as integer, omits `year_int` and `date`
- [ ] Explicit `id` values (max+1, max+2, ...)
- [ ] Insert succeeded with `Prefer: return=representation`, rows verified
- [ ] Batch file saved to `scripts/events-data/<theme>-batch.js` with named export
- [ ] Committed and pushed to GitHub `main` (triggers Vercel auto-deploy)
- [ ] User reminded to rotate secret key if it was pasted in chat
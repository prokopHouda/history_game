---
name: generate-new-events
description: |
  Use this skill when the user asks to add, create, generate, or insert new historical events into the history_game Supabase database.
  The user can simply state a count and optionally a region/country/timeframe, e.g. "add 10 events about African history" or "generate 5 events from the 1800s".
  This skill handles the full pipeline: research events, dedupe against existing rows, insert into Supabase, and commit the batch file to GitHub.
  NEVER insert duplicate events — always query existing `short_name` values first and skip any that already exist.
---

# Generate New Events — history_game

## What this skill does

Adds new historical events to the `events` table in Supabase and commits a reusable batch file to GitHub.

## Invocation

The user can simply write a natural-language request, for example:

- "add 10 events"
- "generate 5 events about African history"
- "insert 8 events from the 1800s in Europe"
- "create 12 Asian events before 1500"

Parse the request for:
- **count** (required) — how many events to add
- **region / countries** (optional) — e.g. Africa, Asia, Europe, China, Japan
- **timeframe** (optional) — e.g. "1800s", "before 1500", "20th century", "ancient"
- **theme** (optional) — e.g. "science", "wars", "exploration"

When the user says a country name (e.g. "China", "Japan"), map it to its **ISO 3166-1 alpha-2 code** (`CN`, `JP`) for the `countries` column. The user speaks in country names; the database stores codes.

If the user gives only a count with no scope, pick a region/era that broadens coverage. Query `events` first to see which regions/eras are underrepresented, then propose events that fill gaps.

## ⚠️ Critical Rule — NEVER add duplicate events

**Before generating any events, query the existing `events` table and check the candidate `short_name` values against existing rows.** Skip any event whose `short_name` already exists. This is non-negotiable.

The dedupe check uses the `short_name` column (case-sensitive, exact match). Query all existing names matching the theme/region first, then only propose events whose names are NOT in that set.

## Supabase connection

- **Project URL**: `https://wsxnspagxjitesktltev.supabase.co`
- **REST base**: `https://wsxnspagxjitesktltev.supabase.co/rest/v1`
- **Auth key**: the user's Supabase **secret API key** (new name for the old `service_role` key). Ask the user to paste it if it's not already in this session's context. The env var name in the codebase is `SUPABASE_SERVICE_ROLE_KEY` (legacy name kept for compatibility).

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
| `region`      | text         | recommended        | One of: `Europe`, `Asia`, `Africa`, `Americas`, `Oceania`, `World`. Drives the region filter. |
| `fun_fact`    | text         | recommended        | Short trivia shown after a correct answer. Improves player experience. |
| `year_int`    | integer      | **never insert**   | **Generated column** derived from `year`. Writing it throws `428C9: cannot insert a non-DEFAULT value into column "year_int"`. |
| `date`        | date (real)  | optional           | Real SQL `date` type, **nullable**. Strings like `"618 AD"` throw `22007: invalid input syntax for type date`. Most existing rows leave it `null`. Omit it unless you have a precise ISO date (`YYYY-MM-DD`). |

### Minimal valid insert payload

```json
{
  "id": 511,
  "short_name": "Tang Dynasty Established",
  "year": 618,
  "description": "The Tang dynasty is founded...",
  "countries": "CN",
  "region": "Asia",
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
| USA | `US` | | Canada | `CA` | | Mexico | `MX` |
| Brazil | `BR` | | Argentina | `AR` | | Chile | `CL` |
| Colombia | `CO` | | Peru | `PE` | | Cuba | `CU` |
| UK | `GB` | | France | `FR` | | Germany | `DE` |
| Italy | `IT` | | Spain | `ES` | | Portugal | `PT` |
| Netherlands | `NL` | | Belgium | `BE` | | Switzerland | `CH` |
| Austria | `AT` | | Poland | `PL` | | Russia | `RU` |
| Czechia | `CZ` | | Slovakia | `SK` | | Hungary | `HU` |
| Croatia | `HR` | | Serbia | `RS` | | Bosnia | `BA` |
| Montenegro | `ME` | | Slovenia | `SI` | | Lithuania | `LT` |
| Ireland | `IE` | | Denmark | `DK` | | Sweden | `SE` |
| Norway | `NO` | | Finland | `FI` | | Greece | `GR` |
| Romania | `RO` | | Bulgaria | `BG` | | Ukraine | `UA` |
| Australia | `AU` | | New Zealand | `NZ` | | Papua New Guinea | `PG` |

For countries not in this table, look up the ISO 3166-1 alpha-2 code before generating the payload. Use the official code in uppercase. Multi-country events use comma-separated codes: `"CN, MN"`, `"IN, PK"`, `"CZ, SK"`.

## Translations are automatic — do NOT insert them

The `event_translations` table is populated lazily by `/api/translate` (DeepL) the first time a player views an event in `cs` or `it`. Adding English source rows is enough. Never manually insert translations.

## Full workflow

### 1. Ask for the secret key (if not already in context)

If you don't already have `sb_secret_...` in this session, ask the user to paste it. The publishable/anon key (`sb_publishable_...`) will NOT work for inserts — RLS blocks it.

### 2. Query existing events to inform generation

```powershell
# Get current max id
$url = "https://wsxnspagxjitesktltev.supabase.co/rest/v1/events?select=id&order=id.desc&limit=1"
$r = Invoke-RestMethod -Uri $url -Headers $hdr -Method Get
$maxId = $r[0].id

# Get existing names in the target region (to avoid duplicates)
$url = "https://wsxnspagxjitesktltev.supabase.co/rest/v1/events?select=short_name&region=eq.Asia"
$existing = (Invoke-RestMethod -Uri $url -Headers $hdr -Method Get).short_name
```

### 3. Research and propose the events

Generate `count` candidate events fitting the user's scope. For each event, provide:
- `short_name` — must NOT match any existing `short_name`
- `year` — integer
- `description` — factual, 1-3 sentences
- `countries` — **comma-separated ISO 3166-1 alpha-2 codes (UPPERCASE)**, e.g. `"CN, MN"`. Never full country names. See the code table above.
- `region` — one of the canonical values
- `fun_fact` — short trivia

**Present the proposed list to the user for approval before inserting.** Use a markdown table so it's easy to review/edit. The user may remove rows, edit text, or ask for replacements.

### 4. Insert via the Supabase REST API

Once approved, build the payload array and POST. Assign sequential ids starting at `maxId + 1`.

```powershell
$body = @(
  @{ id=522; short_name="..."; year=...; description="..."; countries="..."; region="..."; fun_fact="..." },
  # ...
)
$json = $body | ConvertTo-Json -Compress
$url = "https://wsxnspagxjitesktltev.supabase.co/rest/v1/events?select=id,short_name,year,year_int,countries,region"
$r = Invoke-RestMethod -Uri $url -Headers $hdr -Method Post -Body $json -ContentType "application/json"
```

**Do not include `year_int` or `date` in the payload.** They will cause 400 errors.

### 5. Verify the insert

Query back the inserted rows by id or short_name to confirm they're in the table and `year_int` was auto-generated correctly.

### 6. Save the batch file

Write the inserted events (with the corrected schema — `year` as int, no `year_int`, no `date`, explicit `id`) to a new data file under `scripts/events-data/`. Name it after the theme, e.g. `scripts/events-data/africa-batch.js`:

```javascript
export const africaBatch = [
  { id: 522, short_name: "...", year: 1325, description: "...", countries: "...", region: "Africa", fun_fact: "..." },
  // ...
];
```

Use a named export (`const <theme>Batch = [...]`) so `scripts/seed-events.js` can pick it up.

### 7. Commit to GitHub

Use the bundled git from GitHub Desktop (git is not on PATH on this machine):

```powershell
$git = (Get-ChildItem "C:\Users\proko\AppData\Local\GitHubDesktop" -Recurse -Filter git.exe -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
& $git -C "C:\Users\proko\Documents\GitHub\history_game" add scripts/events-data/<theme>-batch.js
& $git -C "C:\Users\proko\Documents\GitHub\history_game" commit -m "chore: add <theme> event batch (<count> events)"
& $git -C "C:\Users\proko\Documents\GitHub\history_game" push origin main
```

Only commit the new batch file. Do not commit `AGENTS.md` or other unrelated changes unless they're directly relevant. The `scripts/seed-events.js` script already exists and is reusable — no need to modify it.

### 8. Remind the user to rotate the secret key

If the user pasted the secret key in chat, remind them to rotate it in Supabase Dashboard → Settings → API → roll secret, then update the Vercel env var `SUPABASE_SERVICE_ROLE_KEY`.

## Error reference (from real failures in this project)

| HTTP | code   | cause | fix |
|------|--------|-------|-----|
| 401  | —      | Default PowerShell User-Agent looks like a browser | Set `User-Agent: node-fetch/seed-script` header |
| 400  | `428C9` | Tried to insert `year_int` | Remove `year_int` from payload — it's a generated column |
| 400  | `22007` | `date` value like `"618 AD"` is not a valid SQL date | Omit `date`, or use ISO `YYYY-MM-DD` |
| 400  | `23502` | Missing `id` | `id` is NOT auto-increment — supply an explicit integer |
| 400  | `400`  | `short_name=in.(...)` filter with bad encoding | Use `encodeURIComponent` on each name, join with `,` inside `in.(...)` |

## Existing reusable tooling

- **`scripts/seed-events.js`** — dependency-free Node script (uses built-in `fetch`, no `@supabase/supabase-js` import). Dedupes by `short_name`, inserts via REST, reports inserted ids. Run with: `SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed-events.js scripts/events-data/<batch>.js`. Requires Node on PATH (not always present on this machine — fall back to PowerShell `Invoke-RestMethod` if `node` is missing).
- **`scripts/events-data/asia-batch.js`** — example batch file, 11 events (ids 511-521). Use as the template for new batch files.

## Summary checklist

- [ ] Secret key obtained (or already in context)
- [ ] Queried existing `short_name` values for the target region
- [ ] Proposed events presented to user for approval
- [ ] No `short_name` duplicates with existing rows
- [ ] `countries` uses ISO 3166-1 alpha-2 codes (UPPERCASE), not full country names
- [ ] Payload uses `year` as integer, omits `year_int` and `date`
- [ ] Explicit `id` values (max+1, max+2, ...)
- [ ] Insert succeeded, rows verified
- [ ] Batch file saved to `scripts/events-data/<theme>-batch.js`
- [ ] Committed and pushed to GitHub `main`
- [ ] User reminded to rotate secret key if it was pasted in chat
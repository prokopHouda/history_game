# Higher or Lower Games - API Reference

Base URL: `https://history-game.vercel.app/api` *(update with your actual deployment URL)*

## Game parameter

Most endpoints are **game-aware**. Pass `"game": "history"`, `"game": "mountains"` or `"game": "rivers"` (defaults to `"history"`), or for `/api/translate` the query param `&game=`. Rooms store their game at creation and all turn/translate logic reads it back from the room row.

---

## `/api/room`

Handles room lifecycle: creation, joining, profile updates, starting, restarting, leaving, and heartbeats.

### `POST /api/room` — Create Room

Create a new multiplayer room. Host is automatically added to the `players` array. The `game` field selects the game's data table, filter keys and pair mechanics.

**Request body (history):**
```json
{
  "action": "create",
  "playerId": "abc123",
  "game": "history",
  "total_rounds": 10,
  "filters": {
    "startYear": 1500,
    "endYear": 2000,
    "region": "Europe",
    "country": "CZ"
  },
  "nickname": "Alice",
  "color": "#ef4444"
}
```

**Request body (mountains):**
```json
{
  "action": "create",
  "playerId": "abc123",
  "game": "mountains",
  "total_rounds": 10,
  "filters": {
    "minElevation": 2000,
    "maxElevation": 8849,
    "region": "Europe",
    "country": "CH"
  },
  "nickname": "Alice",
  "color": "#ef4444"
}
```

**Request body (rivers):**
```json
{
  "action": "create",
  "playerId": "abc123",
  "game": "rivers",
  "total_rounds": 10,
  "filters": {
    "minLength": 1000,
    "maxLength": 6650,
    "region": "Europe",
    "country": "DE"
  },
  "nickname": "Alice",
  "color": "#ef4444"
}
```

Filter keys are game-specific (see `lib/games.js` → `mechanics.filters`); the API ignores keys that don't belong to the room's game. All games use the same UN M49 `region` taxonomy; the country filter always takes an ISO-2 code (the UI displays localized country names).

**Response:**
```json
{
  "room": {
    "id": 1,
    "code": "xyz",
    "game": "history",
    "state": "lobby",
    "total_rounds": 10,
    "current_round": 1,
    "scores": {},
    "players": [
      { "id": "abc123", "nickname": "Alice", "color": "#ef4444", "isHost": true }
    ],
    "current_pair": [...],
    "shown_pairs": [],
    "heartbeats": { "abc123": "2026-05-27T12:00:00.000Z" }
  }
}
```

---

### `POST /api/room` — Join Room

Join an existing room by 3-letter code. Rejected if game is in progress or room is full (10 players).

**Request body:**
```json
{
  "action": "join",
  "roomCode": "xyz",
  "playerId": "def456",
  "nickname": "Bob",
  "color": "#3b82f6"
}
```

**Response:**
```json
{
  "room": {
    "id": 1,
    "code": "xyz",
    "state": "lobby",
    "total_rounds": 10,
    "current_round": 1,
    "scores": { "abc123": 0, "def456": 0 },
    "players": [
      { "id": "abc123", "nickname": "Alice", "color": "#ef4444", "isHost": true },
      { "id": "def456", "nickname": "Bob", "color": "#3b82f6", "isHost": false }
    ],
    "current_pair": [...]
  }
}
```

---

### `POST /api/room` — Update Profile

Update your nickname and/or color while in the waiting room. The `color` value must be one of the predefined `DEFAULT_COLORS` (`#ef4444`, `#3b82f6`, `#22c55e`, `#eab308`, `#a855f7`, `#f97316`, `#ec4899`, `#14b8a6`, `#84cc16`, `#6366f1`); invalid colors are silently ignored and the existing color is kept.

**Request body:**
```json
{
  "action": "update-profile",
  "roomCode": "xyz",
  "playerId": "def456",
  "nickname": "Bobby",
  "color": "#22c55e"
}
```

**Response:**
```json
{ "ok": true }
```

---

### `POST /api/room` — Start Game

Host-only action. Starts the game when there are at least 2 players in the room.

**Request body:**
```json
{
  "action": "start",
  "roomCode": "xyz",
  "playerId": "abc123"
}
```

**Response:**
```json
{
  "room": {
    "state": "playing",
    "scores": { "abc123": 0, "def456": 0 },
    "current_round": 1,
    "current_pair": [...],
    "round_started_at": "2026-05-27T12:00:00.000Z"
  }
}
```

---

### `POST /api/room` — Restart Room (Play Again)

Signal readiness to play again. When all players are ready, the room resets to `lobby` state.

**Request body:**
```json
{
  "action": "restart",
  "roomCode": "xyz",
  "playerId": "abc123"
}
```

**Response (waiting):**
```json
{ "waiting": true }
```

**Response (restarted):**
```json
{
  "room": { "state": "lobby", ... },
  "restarted": true
}
```

---

### `POST /api/room` — Leave Room

Remove yourself from the room. If the host leaves while in lobby, the room is destroyed.

**Request body:**
```json
{
  "action": "leave",
  "roomCode": "xyz",
  "playerId": "abc123"
}
```

**Response (host left in lobby):**
```json
{ "roomClosed": true }
```

**Response (normal leave):**
```json
{ "ok": true }
```

---

### `POST /api/room` — Heartbeat

Send a keep-alive ping so the server knows the player is still connected.

**Request body:**
```json
{
  "action": "heartbeat",
  "roomCode": "xyz",
  "playerId": "abc123"
}
```

**Response:**
```json
{ "ok": true }
```

---

### `POST /api/room` — Check Heartbeat

Check whether other players are still alive. If the host is disconnected in lobby, returns `roomClosed: true`.

**Request body:**
```json
{
  "action": "check-heartbeat",
  "roomCode": "xyz",
  "playerId": "abc123"
}
```

**Response:**
```json
{
  "alive": {
    "abc123": true,
    "def456": true,
    "ghi789": false
  },
  "roomClosed": false
}
```

---

## `/api/turn`

Handles player answer submission and scoring. Comparison direction and point thresholds come from the room's game: history = earlier wins (+1 at gap ≥ 100 years), mountains = higher wins (+1 at gap ≥ 500 m), rivers = longer wins (+1 at gap ≥ 100 km).

### `POST /api/turn` — Submit Answer

Submit which item the player thinks is correct (earlier event / higher mountain / longer river).

**Request body:**
```json
{
  "roomId": 1,
  "playerId": "abc123",
  "choice": "A"
}
```

`choice` can be `"A"`, `"B"`, or `"timeout"` (if the 45s timer expires).

**Response (waiting for others):**
```json
{
  "isCorrect": true,
  "points": 2,
  "allAnswered": false,
  "round": 1,
  "totalRounds": 10
}
```

**Response (all answered — returned to last submitter):**
```json
{
  "isCorrect": true,
  "points": 2,
  "earlier": { "id": 5, "short_name": "..." },
  "later": { "id": 8, "short_name": "..." },
  "scores": { "abc123": 2, "def456": 0, "ghi789": 2 },
  "allAnswered": true,
  "round": 2,
  "totalRounds": 10,
  "winner": null
}
```

Note: the `earlier`/`later` keys mean "the correct answer" / "the wrong one" — for mountains rooms they carry the higher/lower peak, for rivers rooms the longer/shorter river. The key names are kept for wire compatibility.

**Server-side deadline:** If 45 seconds pass since `round_started_at` and not all active players have answered, the server auto-marks missing players as `timedOut` (0 points) and advances the round.

---

## `/api/finish`

Forces the game to finish and returns full standings.

### `POST /api/finish`

**Request body:**
```json
{
  "roomId": 1,
  "playerId": "abc123"
}
```

**Response:**
```json
{
  "ok": true,
  "winner": [
    { "id": "abc123", "nickname": "Alice", "color": "#ef4444", "score": 15 },
    { "id": "ghi789", "nickname": "Charlie", "color": "#22c55e", "score": 12 },
    { "id": "def456", "nickname": "Bob", "color": "#3b82f6", "score": 8 }
  ]
}
```

---

## `/api/translate`

DeepL translation proxy with Supabase caching. Translates from the game's data table into its translations table.

### `GET /api/translate`

Request translations for a batch of item IDs.

**Query params:**
- `ids` — comma-separated item ids (events for `history`, mountains for `mountains`, rivers for `rivers`)
- `lang` — target language (`cs`, `it`; `en` returns empty)
- `game` — `history` (default), `mountains` or `rivers`; selects `events`/`event_translations`, `mountains`/`mountain_translations` or `rivers`/`river_translations`

**Example:**
```
GET /api/translate?ids=1,2,3&lang=cs&game=mountains
```

**Response:**
```json
{
  "1": { "short_name": "...", "description": "...", "fun_fact": "..." },
  "2": { "short_name": "...", "description": "...", "fun_fact": "..." }
}
```

Missing translations are fetched from DeepL (descriptions + fun facts; short names get description context) and cached back into the game's translations table with `upsert` on `(fk, lang)`.

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Human-readable error message"
}
```

HTTP status codes:
- `400` — Bad request (missing fields, invalid input)
- `403` — Forbidden (room full, player not in room, only host can start)
- `404` — Room or resource not found
- `405` — Method not allowed
- `409` — Conflict (already answered)
- `500` — Server error

---

## WebSocket / Realtime

The frontend subscribes to Supabase Realtime on channel `room:{code}` to receive live room state updates.

**No direct WebSocket API** is exposed by the Next.js app — all realtime communication goes through Supabase.

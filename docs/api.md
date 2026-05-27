# History Game - API Reference

Base URL: `https://history-game.vercel.app/api` *(update with your actual deployment URL)*

---

## `/api/room`

Handles room lifecycle: creation, joining, restarting, and heartbeats.

### `POST /api/room` — Create Room

Create a new multiplayer room.

**Request body:**
```json
{
  "action": "create",
  "playerId": "abc123",
  "total_rounds": 10,
  "filters": {
    "startYear": 1500,
    "endYear": 2000,
    "region": "Europe",
    "country": "CZ"
  }
}
```

**Response:**
```json
{
  "room": {
    "id": 1,
    "code": "xyz",
    "host": "abc123",
    "player_b": null,
    "state": "lobby",
    "total_rounds": 10,
    "current_round": 1,
    "scores": { "abc123": 0 },
    "current_pair": [...],
    "shown_pairs": [],
    "heartbeats": { "abc123": "2026-05-27T12:00:00.000Z" }
  }
}
```

### `POST /api/room` — Join Room

Join an existing room by 3-letter code.

**Request body:**
```json
{
  "action": "join",
  "roomCode": "xyz",
  "playerId": "def456"
}
```

**Response:**
```json
{
  "room": {
    "id": 1,
    "code": "xyz",
    "host": "abc123",
    "player_b": "def456",
    "state": "playing",
    "total_rounds": 10,
    "current_round": 1,
    "scores": { "abc123": 0, "def456": 0 },
    "current_pair": [...]
  }
}
```

### `POST /api/room` — Restart Room

Signal readiness to play again. When both players are ready, the room resets.

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
  "room": { ... },
  "restarted": true
}
```

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

### `POST /api/room` — Check Heartbeat

Check whether the opponent is still alive (last heartbeat < 35 seconds ago).

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
{ "alive": true }
```

---

## `/api/turn`

Handles player answer submission and scoring.

### `POST /api/turn` — Submit Answer

Submit which event the player thinks occurred earlier.

**Request body:**
```json
{
  "roomId": 1,
  "playerId": "abc123",
  "choice": "A"
}
```

`choice` can be `"A"`, `"B"`, or `"timeout"` (if the 45s timer expires).

**Response (waiting for opponent):**
```json
{
  "isCorrect": true,
  "points": 2,
  "allAnswered": false,
  "round": 1,
  "totalRounds": 10
}
```

**Response (both answered — returned to second submitter):**
```json
{
  "isCorrect": true,
  "points": 2,
  "earlier": { "id": 5, "short_name": "..." },
  "later": { "id": 8, "short_name": "..." },
  "scores": { "abc123": 2, "def456": 0 },
  "allAnswered": true,
  "round": 2,
  "totalRounds": 10,
  "winner": null
}
```

---

## `/api/finish`

Forces the game to finish and declares a winner.

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
  "winner": {
    "id": "abc123",
    "score": 15,
    "badge": "🏆"
  }
}
```

---

## `/api/translate`

DeepL translation proxy with Supabase caching.

### `POST /api/translate`

Request translations for a batch of event IDs.

**Request body:**
```json
{
  "ids": [1, 2, 3],
  "lang": "cs"
}
```

**Response:**
```json
{
  "translations": [
    { "event_id": 1, "short_name": "...", "description": "...", "fun_fact": "..." }
  ],
  "cached": true
}
```

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
- `403` — Forbidden (room full, player not in room)
- `404` — Room or resource not found
- `405` — Method not allowed
- `409` — Conflict (already answered)
- `500` — Server error

---

## WebSocket / Realtime

The frontend subscribes to Supabase Realtime on channel `room:{code}` to receive live room state updates.

**No direct WebSocket API** is exposed by the Next.js app — all realtime communication goes through Supabase.

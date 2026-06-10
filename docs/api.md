# History Game - API Reference

Base URL: `https://history-game.vercel.app/api` *(update with your actual deployment URL)*

---

## `/api/room`

Handles room lifecycle: creation, joining, profile updates, starting, restarting, leaving, and heartbeats.

### `POST /api/room` — Create Room

Create a new multiplayer room. Host is automatically added to the `players` array.

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
  },
  "nickname": "Alice",
  "color": "#ef4444"
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

Update your nickname and/or color while in the waiting room.

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
- `403` — Forbidden (room full, player not in room, only host can start)
- `404` — Room or resource not found
- `405` — Method not allowed
- `409` — Conflict (already answered)
- `500` — Server error

---

## WebSocket / Realtime

The frontend subscribes to Supabase Realtime on channel `room:{code}` to receive live room state updates.

**No direct WebSocket API** is exposed by the Next.js app — all realtime communication goes through Supabase.

# History Game — Architecture

## System Overview

```mermaid
flowchart TB
    subgraph Client["Browser (2+ players)"]
        A["Next.js Pages Router"]
        A --> SP["/ (Single Player)"]
        A --> MP["/multiplayer (2-10 players)"]
        A --> API["/api/*"]
    end

    subgraph Vercel["Vercel Edge"]
        API --> R["/api/room<br/>create / join / clear-result"]
        API --> T["/api/turn<br/>submit answer"]
        API --> X["/api/translate<br/>DeepL proxy + cache"]
    end

    subgraph Supabase["Supabase"]
        DB[("PostgreSQL")]
        RL["Realtime (WebSocket)"]
        DB --> RL
    end

    subgraph External["External APIs"]
        D["DeepL Translate API"]
    end

    R --> DB
    T --> DB
    X --> DB
    X --> D
    RL --> MP
```

---

## Multiplayer Data Flow

```mermaid
sequenceDiagram
    actor Host
    actor Guest1
    actor Guest2
    participant API as /api/room
    participant Turn as /api/turn
    participant DB as rooms table
    participant RT as Supabase Realtime

    Note over Host, Guest2: Lobby Phase
    Host->>API: create(filters, rounds, lang)
    API->>DB: INSERT room(code, players=[{host}], state='lobby')
    API-->>Host: room.code
    Guest1->>API: join(code, lang)
    API->>DB: UPDATE players += guest1
    API-->>Guest1: room
    Guest2->>API: join(code, lang)
    API->>DB: UPDATE players += guest2
    API-->>Guest2: room

    Note over Host, Guest2: Host Starts Game
    Host->>API: start(code, playerId)
    API->>DB: UPDATE state='playing', scores, current_pair
    API-->>Host: room

    Note over Host, Guest2: Round 1 — All Answer
    Host->>Turn: submit(roomId, choice='A')
    Turn->>DB: UPDATE answered[host] = {...}
    Turn-->>Host: {ok, waiting}
    Guest1->>Turn: submit(roomId, choice='B')
    Turn->>DB: UPDATE answered[guest1] = {...}
    Turn-->>Guest1: {ok, waiting}
    Guest2->>Turn: submit(roomId, choice='A')
    Turn->>DB: UPDATE scores+=points, last_result={...}, current_pair=new, answered={}
    Turn-->>Guest2: {ok, allAnswered}

    Note over Host, Guest2: Result Phase (3.5s)
    DB->>RT: broadcast UPDATE
    RT-->>Host: last_result + new current_pair
    RT-->>Guest1: last_result + new current_pair
    RT-->>Guest2: last_result + new current_pair
    Host->>Host: show overlay + leaderboard
    Guest1->>Guest1: show overlay + leaderboard
    Guest2->>Guest2: show overlay + leaderboard
    Note over Host, Guest2: 3.5s timer (10s if fun fact)
    Host->>Host: hide overlay, next round
    Guest1->>Guest1: hide overlay, next round
    Guest2->>Guest2: hide overlay, next round
```
```

---

## Single-Player Data Flow

```mermaid
sequenceDiagram
    actor Player
    participant FE as / (Next.js)
    participant Events as / (getServerSideProps)
    participant Supa as Supabase
    participant D as DeepL API
    participant Cache as event_translations

    Player->>FE: open /
    FE->>Events: load random pair
    Events->>Supa: SELECT * FROM events
    Supa-->>Events: events[]
    FE-->>Player: render cards

    alt Language ≠ EN
        FE->>FE: check cache
        FE->>Supa: SELECT * FROM event_translations WHERE lang = ?
        Supa-->>FE: cached translations
        alt Some missing
            FE->>D: translate(missingIds)
            D-->>FE: translations[]
            FE->>Supa: INSERT INTO event_translations
        end
    end
```

---

## Database Schema

```mermaid
erDiagram
    EVENTS {
        int id PK
        varchar short_name
        text description
        date date
        int year
        varchar countries
        varchar region
    }

    EVENT_TRANSLATIONS {
        int id PK
        int event_id FK
        varchar lang
        varchar short_name
        text description
    }

    ROOMS {
        int id PK
        varchar code
        jsonb players
        jsonb scores
        jsonb streaks
        jsonb answered
        jsonb last_result
        jsonb events
        jsonb current_pair
        jsonb shown_pairs
        jsonb heartbeats
        int current_round
        int total_rounds
        timestamptz round_started_at
        varchar next_round_at
        varchar state
    }

    EVENTS ||--o{ EVENT_TRANSLATIONS : "translated to"
```

---

## Room State Machine

```mermaid
stateDiagram-v2
    [*] --> lobby : createRoom()
    lobby --> playing : startGame() [host]
    playing --> playing : submitAnswer()
    playing --> finished : round > total_rounds
    finished --> lobby : playAgain (all ready)
    lobby --> [*] : host leaves
```

---

## Turn.js Scoring Logic

```mermaid
flowchart TD
    A["Player submits answer"] --> B{"Is correct?"}
    B -->|Yes| C{"Year gap ≥ 100?"}
    C -->|Yes| D["+1 point (simple question)"]
    C -->|No| E["+2 points (tough question)"]
    B -->|No| F["0 points (no punishment)"]
    D --> G["Store in answered[playerId]"]
    E --> G
    F --> G
    G --> H{"All active players answered OR 45s deadline passed?"}
    H -->|Yes| I["Atomically:<br/>1. Add all scores<br/>2. Auto-timeout missing players<br/>3. Pick new pair<br/>4. Set last_result<br/>5. Clear answered"]
    H -->|No| J["UPDATE answered only"]
    I --> K["Broadcast via Realtime"]
    J --> K
    L["Timer expires (45s)"] --> M["answered.timedOut = true, 0pts"]
    M --> G
```

| Scenario | Year Gap | Correct Points | Wrong Points | Timed Out |
|----------|----------|---------------|--------------|-----------|
| Simple question | ≥ 100 years | +1 | **0** | **0** |
| Tough question | < 100 years | +2 | **0** | **0** |

---

## Event Pairing Algorithm (`pickPair.js`)

The game generates pairs of historical events for each round. Events that are **closer in time** are preferred, but with a **hard minimum gap of 10 years** — events 10 years apart or less are completely excluded from pairing. This prevents ambiguous "too-close-to-call" rounds while still favoring challenging nearby dates over easy distant ones.

### Minimum Gap Rule

```
MIN_GAP_YEARS = 10
```

Any candidate event where `gapYears ≤ 10` is **rejected immediately** before weight calculation. This applies to **all three** generation phases (weighted sampling, linear scan fallback, and nuclear fallback).

### Weight Function

After filtering out gaps ≤ 10 years, the selection uses a **proximity-weighted random sample**. The weight for a remaining candidate is:

```
weight = 1 / (1 + gapYears / 100)
```

Where `gapYears` is the absolute difference in years between the two events.

### Weight Examples

| Year Gap | Weight | Relative Likelihood | Eligible? |
|----------|--------|---------------------|-----------|
| 5 years  | 0.667  | 2.0x vs 20-year gap | ❌ Rejected (≤10) |
| 10 years | 0.500  | 1.5x vs 20-year gap | ❌ Rejected (≤10) |
| 11 years | 0.476  | 1.4x vs 20-year gap | ✅ Yes |
| 20 years | 0.333  | baseline | ✅ Yes |
| 50 years | 0.167  | 0.5x vs 20-year gap | ✅ Yes |
| 100 years| 0.091  | 0.27x vs 20-year gap | ✅ Yes |
| 200 years| 0.048  | 0.14x vs 20-year gap | ✅ Yes |
| 500 years| 0.020  | 0.06x vs 20-year gap | ✅ Yes |

**Key property:** now that the 0–10 year range is excluded, the effective "sweet spot" shifts to 11–50 year gaps. A 20-year gap is the new most-likely baseline, making most rounds challenging (+2 points) while still allowing occasional simpler 100+ year pairs.

### Pair Generation Flow

```mermaid
flowchart TD
    A["Start pair generation"] --> B{"Events ≥ 2?"}
    B -->|No| C["Throw error"]
    B -->|Yes| D["Phase 1: Weighted sampling"]
    D --> E{"Attempt < 20?"}
    E -->|Yes| F["Pick random event A"]
    F --> G["Build candidate list\nexcluding duplicates"]
    G --> H{"Gap > MIN_GAP?"}
    H -->|No| G
    H -->|Yes| I["Assign gapWeight to each candidate"]
    I --> J["Weighted random pick → B"]
    J --> K{"Is pair new?"}
    K -->|Yes| L["Return [A, B]"]
    K -->|No| E
    E -->|No| M["Phase 2: Linear scan"]
    M --> N{"Gap > MIN_GAP?"}
    N -->|No| M
    N -->|Yes| O["Find first unused pair"]
    O -->|Found| L
    O -->|Not found| P["Phase 3: Clear history"]
    P --> Q{"Gap > MIN_GAP?"}
    Q -->|No| P
    Q -->|Yes| R["Reset shown_pairs"]
    R --> L
```

### Deduplication (`shown_pairs`)

Each room stores a `shown_pairs` JSONB array in the `rooms` table. It contains canonical string keys of every pair already shown, formatted as:

```
canonicalKey(idA, idB) = `${min(idA, idB)}-${max(idA, idB)}`
```

This guarantees:
- No repeated questions in a single game
- Deterministic key regardless of which event is "A" or "B"
- Automatic reset when all valid pairs are exhausted (nuclear fallback)

The single-player game also uses `pickPair` with an in-memory `Set` (reset on each new game via "Start Game") for the same anti-repeat behaviour.

### Why Proximity Weighting + Minimum Gap?

| Without any weighting | With proximity weighting only | With weighting + 10-year MIN_GAP |
|-------------------|----------------|---------------------------------|
| Random pairs → many 500+ year gaps | Most pairs are 20–100 years apart | Most pairs are **11–50 years** apart |
| Players get bored from easy +1 rounds | More challenging +2 rounds | **Even more** +2 rounds |
| Occasional 2-year ambiguity | 0–10 year ambiguities possible | **Zero ambiguity** — every round is decidable |
| Low skill differentiation | Tighter scores | Tighter scores + clearer answers |

---

## File Structure

```
pages/
├── index.js              # Single-player game
├── multiplayer.js        # Multiplayer lobby (2-10 players) + game UI + leaderboard
├── api/
│   ├── room.js           # create / join / update-profile / start / restart / leave / heartbeat
│   ├── turn.js           # submit answer + calculate score + 45s deadline
│   ├── finish.js         # force finish + build full standings
│   └── translate.js      # DeepL proxy + Supabase cache
lib/
├── pickPair.js           # Shared pair generation (proximity-weighted + dedup, MIN_GAP_YEARS=10)
└── eventTime.js          # Shared getEventYear() / getEventTime() — single source of truth for event dating
```

---

## Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_KEY` | Client + Server | Supabase anon key (safe for client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Full DB access for APIs |
| `DEEPL_API_KEY` | Server only | DeepL authentication |

---

## Deployment Pipeline

```mermaid
flowchart LR
    A["Developer commits to main"] --> B["GitHub"]
    B --> C["Vercel Auto-Deploy"]
    C --> D["Production"]
```
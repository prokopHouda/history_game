# History Game — Architecture

## System Overview

```mermaid
flowchart TB
    subgraph Client["Browser (2+ players)"]
        A["Next.js Pages Router"]
        A --> SP["/ (Single Player)"]
        A --> MP["/multiplayer"]
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
    actor Guest
    participant API as /api/room
    participant Turn as /api/turn
    participant DB as rooms table
    participant RT as Supabase Realtime

    Note over Host, Guest: Lobby Phase
    Host->>API: create(filters, rounds, lang)
    API->>DB: INSERT room(code, host, events, current_pair, scores)
    API-->>Host: room.code
    Guest->>API: join(code, lang)
    API->>DB: UPDATE player_b, state='playing'
    API-->>Guest: room

    Note over Host, Guest: Round 1 — Both Answer
    Host->>Turn: submit(roomId, choice='A')
    Turn->>DB: UPDATE answered[host] = {...}
    Turn-->>Host: {ok, waiting}
    Guest->>Turn: submit(roomId, choice='B')
    Turn->>DB: UPDATE scores+=points, last_result={...},<br/>current_pair=new, answered={}
    Turn-->>Guest: {ok, allAnswered}

    Note over Host, Guest: Result Phase (3.5s)
    DB->>RT: broadcast UPDATE
    RT-->>Host: last_result + new current_pair
    RT-->>Guest: last_result + new current_pair
    Host->>Host: show overlay + freeze tracker
    Guest->>Guest: show overlay + freeze tracker
    Note over Host, Guest: 3.5s timer
    Host->>Host: hide overlay + animate tracker
    Guest->>Guest: hide overlay + animate tracker
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
        varchar host
        varchar player_b
        varchar state
        jsonb scores
        jsonb streaks
        jsonb answered
        jsonb last_result
        jsonb events
        jsonb current_pair
        int current_round
        int total_rounds
        varchar next_round_at
    }

    EVENTS ||--o{ EVENT_TRANSLATIONS : "translated to"
```

---

## Room State Machine

```mermaid
stateDiagram-v2
    [*] --> lobby : createRoom()
    lobby --> playing : joinRoom()
    playing --> playing : submitAnswer()
    playing --> finished : round > total_rounds
    finished --> [*] : playAgain / reload
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
    G --> H{"Both answered?"}
    H -->|Yes| I["Atomically:<br/>1. Add both scores<br/>2. Pick new pair<br/>3. Set last_result<br/>4. Clear answered"]
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
├── multiplayer.js        # Multiplayer lobby + game UI
├── api/
│   ├── room.js           # create / join / clear-result
│   ├── turn.js           # submit answer + calculate score
│   └── translate.js      # DeepL proxy + Supabase cache. Fetches short_name with description context, description/fun_fact plain.
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
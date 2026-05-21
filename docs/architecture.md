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
    C -->|Yes| D["+1 point"]
    C -->|No| E["+2 points"]
    B -->|No| F{"Year gap ≥ 100?"}
    F -->|Yes| G["-1 point"]
    F -->|No| H["0 points"]
    D --> I["Store in answered[playerId]"]
    E --> I
    G --> I
    H --> I
    I --> J{"Both answered?"}
    J -->|Yes| K["Atomically:<br/>1. Add both scores<br/>2. Pick new pair<br/>3. Set last_result<br/>4. Clear answered"]
    J -->|No| L["UPDATE answered only"]
    K --> M["Broadcast via Realtime"]
    L --> M
```

---

## File Structure

```
pages/
├── index.js              # Single-player game
├── multiplayer.js        # Multiplayer lobby + game UI
├── api/
│   ├── room.js           # create / join / clear-result
│   ├── turn.js           # submit answer + calculate score
│   └── translate.js      # DeepL proxy + Supabase cache
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
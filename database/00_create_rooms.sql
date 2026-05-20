-- Enable Realtime on rooms table
alter publication supabase_realtime add table rooms;

-- Create rooms table
create table rooms (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,                    -- e.g. "abc"
  host text not null,                           -- host's random player id
  player_b text,                                -- second player's id
  state text not null default 'lobby',          -- lobby, playing, finished
  events jsonb default '[]'::jsonb,             -- filtered pool of events
  current_pair jsonb default '[]'::jsonb,         -- [event1, event2]
  scores jsonb default '{}'::jsonb,             -- {"host": 0, "b": 0}
  streaks jsonb default '{}'::jsonb,            -- {"host": 0, "b": 0}
  current_round integer default 0,
  answered jsonb default '{}'::jsonb,           -- {"host": true} tracks who answered
  winner jsonb default null,                     -- {"id": "host", "badge": "🏆"}
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast room code lookup
create index rooms_code_idx on rooms(code);

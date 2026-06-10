-- Migration: support up to 10 players with nicknames/colors
-- and server-side round timer for auto-advance

-- Players array replaces the binary host/player_b model.
-- Each player: {id, nickname, color, isHost}
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS players JSONB DEFAULT '[]'::jsonb;

-- Timestamp for the current round start, used by server to enforce 45s deadline
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS round_started_at TIMESTAMPTZ DEFAULT NULL;

-- Maximum players allowed in a room (default 10, host can change if desired)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT 10;

-- Ensure player_b is preserved for backward compatibility with old rows,
-- but new code should read from players array exclusively.

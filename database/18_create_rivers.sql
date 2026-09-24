-- Rivers Game Tables
-- Mirroring the mountains structure

CREATE TABLE rivers (
    id TEXT PRIMARY KEY,
    short_name TEXT NOT NULL,
    length INTEGER NOT NULL,
    description TEXT,
    countries TEXT,
    region TEXT,
    fun_fact TEXT
);

CREATE TABLE river_translations (
    river_id TEXT REFERENCES rivers(id) ON DELETE CASCADE,
    lang VARCHAR(5) NOT NULL,
    short_name TEXT,
    description TEXT,
    fun_fact TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (river_id, lang)
);

-- RLS Policies
ALTER TABLE rivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rivers are public" ON rivers FOR SELECT USING (true);

-- Note: Translations are typically handled by service role via API.
ALTER TABLE river_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Translations are public" ON river_translations FOR SELECT USING (true);

-- Enable Realtime for multiplayer (if rooms table is shared)
-- The rooms table is shared across games, so no need to enable it specifically for rivers.

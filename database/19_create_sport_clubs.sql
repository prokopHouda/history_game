-- Sport Clubs Game Tables
-- Mirroring the rivers structure (migration 18).

CREATE TABLE sport_clubs (
    id INTEGER PRIMARY KEY,
    short_name TEXT NOT NULL,
    founded_year INTEGER NOT NULL,
    description TEXT,
    countries TEXT,
    sport TEXT,
    region TEXT,
    fun_fact TEXT
);

CREATE INDEX sport_clubs_founded_year_idx ON sport_clubs(founded_year);

CREATE TABLE sport_club_translations (
    club_id INTEGER REFERENCES sport_clubs(id) ON DELETE CASCADE,
    lang VARCHAR(5) NOT NULL,
    short_name TEXT,
    description TEXT,
    fun_fact TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (club_id, lang)
);

-- RLS Policies
ALTER TABLE sport_clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sport clubs are public" ON sport_clubs FOR SELECT USING (true);

ALTER TABLE sport_club_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Translations are public" ON sport_club_translations FOR SELECT USING (true);

-- The rooms table is shared across games, so no need to enable it specifically for sport clubs.
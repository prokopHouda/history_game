-- Create mountains + mountain_translations tables (mirrors events schema).
-- Idempotent: safe to re-run if partially applied previously.
-- Run AFTER 12_add_translations_constraints.sql (reuses update_updated_at()).

-- 1. Mountains table
create table if not exists mountains (
  id integer primary key,
  short_name text not null,
  elevation integer not null,
  description text,
  countries text,
  range text,
  fun_fact text
);

create index if not exists mountains_elevation_idx on mountains(elevation);

-- 2. Mountain translations table (mirrors event_translations)
create table if not exists mountain_translations (
  mountain_id integer not null references mountains(id) on delete cascade,
  lang text not null,
  short_name text,
  description text,
  fun_fact text,
  updated_at timestamptz default now(),
  constraint mountain_translations_mountain_id_lang_key unique (mountain_id, lang)
);

-- 3. Auto-update trigger for updated_at (function created in migration 12)
drop trigger if exists mountain_translations_updated_at on mountain_translations;
create trigger mountain_translations_updated_at
  before update on mountain_translations
  for each row execute function update_updated_at();

-- 4. Row Level Security
-- mountains: public read via explicit policy — the game loads its data pool
-- from the browser using the anon key (same access pattern as events).
-- Writes happen only through API routes with the service role key, which
-- bypasses RLS entirely.
alter table mountains enable row level security;
drop policy if exists "mountains_public_read" on mountains;
create policy "mountains_public_read"
  on mountains
  for select
  using (true);

-- mountain_translations: accessed only server-side (/api/translate uses the
-- service role key). RLS enabled with NO policies = anon/authenticated keys
-- cannot read or write it; service role bypasses RLS.
alter table mountain_translations enable row level security;
-- Add unique constraint, foreign key, and updated_at to event_translations
-- Run AFTER verifying results from 11_dedup_translations_inspect.sql
-- Idempotent: safe to re-run if partially applied previously.

-- 1. Clean orphans (safe even if none exist)
DELETE FROM event_translations
WHERE event_id NOT IN (SELECT id FROM events);

-- 2. Dedup: keep newest row (highest ctid) per (event_id, lang)
DELETE FROM event_translations a
USING event_translations b
WHERE a.event_id = b.event_id
  AND a.lang = b.lang
  AND a.ctid < b.ctid;

-- 3. Unique constraint on (event_id, lang) — skip if already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_translations_event_id_lang_key'
      AND conrelid = 'event_translations'::regclass
  ) THEN
    ALTER TABLE event_translations
      ADD CONSTRAINT event_translations_event_id_lang_key
      UNIQUE (event_id, lang);
  END IF;
END $$;

-- 4. Foreign key with cascade delete — skip if already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_translations_event_id_fkey'
      AND conrelid = 'event_translations'::regclass
  ) THEN
    ALTER TABLE event_translations
      ADD CONSTRAINT event_translations_event_id_fkey
      FOREIGN KEY (event_id) REFERENCES events(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Add updated_at column (for future cache freshness tracking)
ALTER TABLE event_translations
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill existing rows
UPDATE event_translations SET updated_at = now() WHERE updated_at IS NULL;

-- 6. Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS event_translations_updated_at ON event_translations;
CREATE TRIGGER event_translations_updated_at
  BEFORE UPDATE ON event_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
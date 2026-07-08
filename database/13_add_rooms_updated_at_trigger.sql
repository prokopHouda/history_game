-- Add auto-update trigger to rooms.updated_at
-- The column already exists (from 00_create_rooms.sql) but never auto-updates.
-- Note: update_updated_at() function is created in migration 12.
-- Run migration 12 FIRST.

DROP TRIGGER IF EXISTS rooms_updated_at ON rooms;
CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
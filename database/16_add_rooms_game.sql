-- Add game column to rooms so a room knows which game it is playing.
-- Existing rooms default to 'history' (the original and only game before this migration).
alter table rooms
  add column if not exists game text not null default 'history';
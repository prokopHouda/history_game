-- Add columns for round results and delayed next round timing
alter table rooms add column if not exists last_result jsonb default null;
alter table rooms add column if not exists next_round_at timestamptz default null;

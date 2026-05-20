-- Add total_rounds column to rooms table
alter table rooms add column if not exists total_rounds integer default 10;

-- Per-area extras (review dates, pros/cons, finance type/category, mood...) live in one jsonb column.
alter table public.items add column meta jsonb not null default '{}';

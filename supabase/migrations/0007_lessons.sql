-- Lessons and the topics inside them (topics link to their lesson via parent_id).
alter table public.items drop constraint items_kind_check;
alter table public.items add constraint items_kind_check
  check (kind in ('goal','project','task','learning','decision','career','finance','development','material','lesson','topic'));

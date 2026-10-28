alter table public.items
  add column priority text not null default 'none' check (priority in ('none','low','medium','high'));

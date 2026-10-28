-- One table for every feature area; `kind` selects the area. Ids are client-generated so offline writes are idempotent upserts.
create table public.items (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  kind text not null check (kind in ('goal','project','task','learning','decision','career','finance','development')),
  title text not null,
  notes text,
  status text not null default 'open' check (status in ('open','done')),
  due_date date,
  amount numeric,
  parent_id uuid references public.items on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index items_user_kind_idx on public.items (user_id, kind) where deleted_at is null;

create trigger items_updated_at before update on public.items
  for each row execute function public.set_updated_at();

alter table public.items enable row level security;

create policy "own items select" on public.items for select using (auth.uid() = user_id);
create policy "own items insert" on public.items for insert with check (auth.uid() = user_id);
create policy "own items update" on public.items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

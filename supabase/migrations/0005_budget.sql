-- Monthly budget follows the user across devices.
alter table public.profiles add column budget numeric;

-- Lets the app create the profile row if the signup trigger didn't (e.g. accounts made before 0001 ran).
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);

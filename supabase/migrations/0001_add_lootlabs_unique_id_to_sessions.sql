alter table public.sessions
  add column if not exists lootlabs_unique_id text;

create unique index if not exists sessions_lootlabs_unique_id_idx
  on public.sessions (lootlabs_unique_id)
  where lootlabs_unique_id is not null;

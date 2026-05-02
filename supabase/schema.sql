create table if not exists public.sessions (
  id text primary key,
  ad_completed boolean not null default false,
  ad_completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.keys (
  id uuid primary key default gen_random_uuid(),
  value text not null unique,
  session_id text not null references public.sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists keys_session_id_idx on public.keys(session_id);
create index if not exists keys_expires_at_idx on public.keys(expires_at);

create table if not exists public.ad_events (
  id uuid primary key default gen_random_uuid(),
  session_id text references public.sessions(id) on delete cascade,
  ref text,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ad_events_session_id_idx on public.ad_events(session_id);

create table if not exists public.rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

create or replace function public.check_rate_limit(
  p_key text,
  p_window_ms int,
  p_limit int
) returns boolean
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_count int;
begin
  insert into public.rate_limits (key, count, window_start)
  values (p_key, 1, v_now)
  on conflict (key) do update
    set
      count = case
        when extract(epoch from (v_now - public.rate_limits.window_start)) * 1000 > p_window_ms
          then 1
        else public.rate_limits.count + 1
      end,
      window_start = case
        when extract(epoch from (v_now - public.rate_limits.window_start)) * 1000 > p_window_ms
          then v_now
        else public.rate_limits.window_start
      end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

alter table public.sessions  enable row level security;
alter table public.keys      enable row level security;
alter table public.ad_events enable row level security;
alter table public.rate_limits enable row level security;

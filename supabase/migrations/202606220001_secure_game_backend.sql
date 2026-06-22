-- Il Segreto di Argil — backend pseudonimo, multi-dispositivo e RLS.
-- Applicare dal SQL Editor Supabase. Nessuna service_role è richiesta nel client.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(nickname) between 2 and 20),
  public_tag text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)),
  coins integer not null default 0 check (coins >= 0),
  completion_code text unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.player_devices (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists player_devices_player_idx on public.player_devices(player_id);

create table if not exists public.chapters (
  id smallint primary key check (id between 1 and 10),
  title text not null,
  unlock_week smallint not null,
  release_at timestamptz,
  reward_coins integer not null default 1 check (reward_coins >= 0),
  solution_hash bytea,
  enabled boolean not null default true
);

create table if not exists public.qr_tokens (
  id uuid primary key default gen_random_uuid(),
  chapter_id smallint not null references public.chapters(id) on delete cascade,
  token_hash bytea not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.progress (
  player_id uuid not null references public.players(id) on delete cascade,
  chapter_id smallint not null references public.chapters(id) on delete cascade,
  status text not null default 'unlocked' check (status in ('unlocked', 'started', 'completed')),
  fragment text,
  started_at timestamptz,
  completed_at timestamptz,
  primary key (player_id, chapter_id)
);

create table if not exists public.qr_redemptions (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  chapter_id smallint not null references public.chapters(id) on delete cascade,
  qr_token_id uuid not null references public.qr_tokens(id),
  redeemed_at timestamptz not null default now(),
  unique (player_id, chapter_id)
);

create table if not exists public.recovery_tokens (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index if not exists recovery_tokens_player_idx on public.recovery_tokens(player_id);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  join_code_hash bytea not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, player_id),
  unique (player_id)
);

insert into public.chapters (id, title, unlock_week, reward_coins, solution_hash)
values
  (1, 'Bar Port Royal', 1, 1, extensions.digest('638', 'sha256')),
  (2, 'Torre dell''Orologio', 2, 1, null),
  (3, 'Chiesa di Sant''Antonino', 3, 1, null),
  (4, 'Belvedere sulla valle', 4, 1, null),
  (5, 'Biblioteca Comunale', 5, 1, null),
  (6, 'Chiesa di Santa Maria Maggiore', 6, 1, null),
  (7, 'Chiesa di San Pietro Apostolo', 7, 1, null),
  (8, 'Palazzo Baronale Colonna', 8, 1, null),
  (9, 'Torre del Castello', 9, 1, null),
  (10, 'Museo Preistorico — Cranio di Argil', 10, 1, null)
on conflict (id) do update set
  title = excluded.title,
  unlock_week = excluded.unlock_week,
  reward_coins = excluded.reward_coins;

-- Token del prototipo già stampabili. Prima del lancio pubblico vanno ruotati
-- con valori casuali più lunghi e rimossi dal bundle client.
insert into public.qr_tokens (chapter_id, token_hash)
values
  (1, extensions.digest('k7m2qx', 'sha256')),
  (2, extensions.digest('v9b4ze', 'sha256')),
  (3, extensions.digest('r3n8wp', 'sha256')),
  (4, extensions.digest('t6c1hd', 'sha256')),
  (5, extensions.digest('y2f5js', 'sha256')),
  (6, extensions.digest('g8l0ak', 'sha256')),
  (7, extensions.digest('p4x7mb', 'sha256')),
  (8, extensions.digest('z1d9rv', 'sha256')),
  (9, extensions.digest('n5q3to', 'sha256')),
  (10, extensions.digest('w0h6ec', 'sha256'))
on conflict (token_hash) do nothing;

-- Restituisce il giocatore associato alla sessione Supabase corrente.
create or replace function public.current_player_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select player_id from public.player_devices where auth_user_id = auth.uid()
$$;

revoke all on function public.current_player_id() from public;
grant execute on function public.current_player_id() to authenticated;

create or replace function public.my_game_state()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'playerId', p.id,
    'nickname', p.nickname,
    'publicTag', p.public_tag,
    'coins', p.coins,
    'completionCode', p.completion_code,
    'unlockedChapters', coalesce((
      select jsonb_agg(pr.chapter_id order by pr.chapter_id)
      from public.progress pr
      where pr.player_id = p.id
    ), '[]'::jsonb),
    'completedLevels', coalesce((
      select jsonb_agg(pr.chapter_id order by pr.chapter_id)
      from public.progress pr
      where pr.player_id = p.id and pr.status = 'completed'
    ), '[]'::jsonb),
    'fragments', coalesce((
      select jsonb_agg(pr.fragment order by pr.chapter_id)
      from public.progress pr
      where pr.player_id = p.id and pr.fragment is not null
    ), '[]'::jsonb)
  )
  from public.players p
  where p.id = public.current_player_id()
$$;

revoke all on function public.my_game_state() from public;
grant execute on function public.my_game_state() to authenticated;

create or replace function public.bootstrap_player(p_nickname text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_player uuid;
  v_nick text := trim(p_nickname);
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if char_length(v_nick) < 2 or char_length(v_nick) > 20 then
    raise exception 'invalid nickname';
  end if;

  select player_id into v_player from public.player_devices where auth_user_id = v_uid;
  if v_player is null then
    insert into public.players(nickname) values (v_nick) returning id into v_player;
    insert into public.player_devices(auth_user_id, player_id) values (v_uid, v_player);
    insert into public.progress(player_id, chapter_id, status)
      values (v_player, 1, 'unlocked') on conflict do nothing;
  else
    update public.player_devices set last_seen_at = now() where auth_user_id = v_uid;
    update public.players set last_seen_at = now() where id = v_player;
  end if;
  return public.my_game_state();
end;
$$;

create or replace function public.create_recovery_pass(p_token text)
returns timestamptz
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_player uuid := public.current_player_id();
  v_expiry timestamptz := now() + interval '180 days';
begin
  if v_player is null then raise exception 'player required'; end if;
  if char_length(p_token) < 40 then raise exception 'token too short'; end if;
  update public.recovery_tokens set used_at = now()
    where player_id = v_player and used_at is null;
  insert into public.recovery_tokens(player_id, token_hash, expires_at)
    values (v_player, extensions.digest(p_token, 'sha256'), v_expiry);
  return v_expiry;
end;
$$;

create or replace function public.claim_recovery_pass(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_recovery public.recovery_tokens%rowtype;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  select * into v_recovery
  from public.recovery_tokens
  where token_hash = extensions.digest(p_token, 'sha256')
    and used_at is null and expires_at > now()
  for update;
  if v_recovery.id is null then raise exception 'invalid or expired recovery pass'; end if;

  insert into public.player_devices(auth_user_id, player_id)
    values (v_uid, v_recovery.player_id)
  on conflict (auth_user_id) do update set
    player_id = excluded.player_id, last_seen_at = now();
  update public.recovery_tokens set used_at = now() where id = v_recovery.id;
  return public.my_game_state();
end;
$$;

create or replace function public.redeem_chapter(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_player uuid := public.current_player_id();
  v_qr public.qr_tokens%rowtype;
begin
  if v_player is null then raise exception 'player required'; end if;
  select q.* into v_qr
  from public.qr_tokens q join public.chapters c on c.id = q.chapter_id
  where q.token_hash = extensions.digest(p_token, 'sha256')
    and q.active and c.enabled
    and (q.expires_at is null or q.expires_at > now())
    and (c.release_at is null or c.release_at <= now());
  if v_qr.id is null then raise exception 'invalid or inactive QR'; end if;

  insert into public.qr_redemptions(player_id, chapter_id, qr_token_id)
    values (v_player, v_qr.chapter_id, v_qr.id) on conflict do nothing;
  insert into public.progress(player_id, chapter_id, status)
    values (v_player, v_qr.chapter_id, 'unlocked') on conflict do nothing;
  return public.my_game_state();
end;
$$;

create or replace function public.complete_chapter(
  p_chapter_id smallint,
  p_solution text,
  p_fragment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_player uuid := public.current_player_id();
  v_reward integer;
  v_expected bytea;
  v_changed integer;
  v_completed integer;
begin
  if v_player is null then raise exception 'player required'; end if;
  select reward_coins, solution_hash into v_reward, v_expected
    from public.chapters where id = p_chapter_id and enabled;
  if v_expected is null or v_expected <> extensions.digest(p_solution, 'sha256') then
    raise exception 'invalid solution';
  end if;
  if not exists (
    select 1 from public.progress
    where player_id = v_player and chapter_id = p_chapter_id
  ) then raise exception 'chapter not unlocked'; end if;

  update public.progress
  set status = 'completed', completed_at = now(), fragment = p_fragment
  where player_id = v_player and chapter_id = p_chapter_id and status <> 'completed';
  get diagnostics v_changed = row_count;
  if v_changed > 0 then
    update public.players set coins = coins + v_reward, last_seen_at = now()
      where id = v_player;
  end if;

  select count(*) into v_completed from public.progress
    where player_id = v_player and status = 'completed';
  if v_completed >= 10 then
    update public.players
      set completion_code = coalesce(completion_code,
        'ARGIL-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 4)) || '-' ||
        upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 4)))
      where id = v_player;
  end if;
  return public.my_game_state();
end;
$$;

revoke all on function public.bootstrap_player(text) from public;
revoke all on function public.create_recovery_pass(text) from public;
revoke all on function public.claim_recovery_pass(text) from public;
revoke all on function public.redeem_chapter(text) from public;
revoke all on function public.complete_chapter(smallint, text, text) from public;
grant execute on function public.bootstrap_player(text) to authenticated;
grant execute on function public.create_recovery_pass(text) to authenticated;
grant execute on function public.claim_recovery_pass(text) to authenticated;
grant execute on function public.redeem_chapter(text) to authenticated;
grant execute on function public.complete_chapter(smallint, text, text) to authenticated;

-- Nessuna tabella è accessibile direttamente dal browser: solo le RPC sopra.
alter table public.players enable row level security;
alter table public.player_devices enable row level security;
alter table public.chapters enable row level security;
alter table public.qr_tokens enable row level security;
alter table public.progress enable row level security;
alter table public.qr_redemptions enable row level security;
alter table public.recovery_tokens enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

revoke all on table
  public.players,
  public.player_devices,
  public.chapters,
  public.qr_tokens,
  public.progress,
  public.qr_redemptions,
  public.recovery_tokens,
  public.teams,
  public.team_members
from anon, authenticated;
revoke all on sequence public.qr_redemptions_id_seq from anon, authenticated;

-- Le funzioni SECURITY DEFINER hanno search_path fissato e sono l'unico confine di scrittura.

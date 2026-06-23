-- Il Segreto di Argil — rate limit anti brute-force sulle soluzioni.
-- Applicare dal SQL Editor Supabase DOPO 202606220001_secure_game_backend.sql.
--
-- Contesto: le soluzioni dei capitoli sono codici corti (es. '638'). Senza
-- limiti, chi chiama l'RPC `complete_chapter` a mano potrebbe provarle tutte.
-- Qui aggiungiamo un blocco per (giocatore, capitolo): dopo N tentativi errati
-- il capitolo si blocca per qualche minuto.
--
-- Nota di design: `complete_chapter` NON solleva più un'eccezione sulla
-- soluzione errata. Un'eccezione farebbe il rollback dell'intera transazione,
-- contatore dei tentativi incluso, rendendo inutile il limite. Invece registra
-- il fallimento (che viene committato) e ritorna lo stato autorevole con il
-- capitolo NON completato: il client fa già `setData(stato_remoto)`, quindi il
-- server resta la fonte di verità e un eventuale stato locale falsificato viene
-- corretto.

create table if not exists public.solution_attempts (
  player_id uuid not null references public.players(id) on delete cascade,
  chapter_id smallint not null references public.chapters(id) on delete cascade,
  fails smallint not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (player_id, chapter_id)
);

-- Tabella interna: nessun accesso diretto dal browser, solo via SECURITY DEFINER.
alter table public.solution_attempts enable row level security;
revoke all on table public.solution_attempts from anon, authenticated;

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
  v_locked timestamptz;
  v_fails smallint;
  v_max_fails constant smallint := 5;
  v_lockout constant interval := interval '5 minutes';
begin
  if v_player is null then raise exception 'player required'; end if;

  if not exists (
    select 1 from public.progress
    where player_id = v_player and chapter_id = p_chapter_id
  ) then raise exception 'chapter not unlocked'; end if;

  -- Se è in lockout per troppi tentativi, non valutare nemmeno la soluzione.
  select locked_until into v_locked
    from public.solution_attempts
    where player_id = v_player and chapter_id = p_chapter_id;
  if v_locked is not null and v_locked > now() then
    return public.my_game_state();
  end if;

  select reward_coins, solution_hash into v_reward, v_expected
    from public.chapters where id = p_chapter_id and enabled;

  if v_expected is null or v_expected <> extensions.digest(p_solution, 'sha256') then
    -- Soluzione errata: registra il tentativo (commit) e applica il lockout.
    insert into public.solution_attempts as sa (player_id, chapter_id, fails, updated_at)
      values (v_player, p_chapter_id, 1, now())
    on conflict (player_id, chapter_id) do update set
      fails = case
                when sa.locked_until is not null and sa.locked_until <= now() then 1
                else sa.fails + 1
              end,
      updated_at = now()
    returning fails into v_fails;

    if v_fails >= v_max_fails then
      update public.solution_attempts
        set locked_until = now() + v_lockout, fails = 0
        where player_id = v_player and chapter_id = p_chapter_id;
    end if;

    return public.my_game_state();
  end if;

  -- Soluzione corretta: avanza il capitolo e azzera i tentativi.
  update public.progress
  set status = 'completed', completed_at = now(), fragment = p_fragment
  where player_id = v_player and chapter_id = p_chapter_id and status <> 'completed';
  get diagnostics v_changed = row_count;
  if v_changed > 0 then
    update public.players set coins = coins + v_reward, last_seen_at = now()
      where id = v_player;
  end if;

  delete from public.solution_attempts
    where player_id = v_player and chapter_id = p_chapter_id;

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

-- `create or replace` mantiene i grant esistenti, ma li riaffermiamo per
-- rendere la migrazione applicabile anche in isolamento.
revoke all on function public.complete_chapter(smallint, text, text) from public;
grant execute on function public.complete_chapter(smallint, text, text) to authenticated;

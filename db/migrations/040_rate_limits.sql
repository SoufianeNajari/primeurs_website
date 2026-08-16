-- Migration 040 — Compteur de rate limiting partagé
--
-- Audit 2026-08-07. lib/rate-limit.ts comptait dans une Map de process. Vercel
-- exécute plusieurs instances de lambda en parallèle et les recycle : le quota
-- annoncé était en pratique multiplié par le nombre d'instances et remis à zéro
-- à chaque cold start. Le plus sensible est le login admin (mot de passe unique
-- partagé, pas de 2FA) où le rate limit est la seule protection anti-bruteforce.
--
-- Un compteur en base, partagé par toutes les instances, avec un RPC atomique
-- sur le modèle de try_consume_code_usage (027) et try_consume_address_usage
-- (033) : une seule instruction SQL, verrou de ligne sur conflit.

create table if not exists public.rate_limits (
  bucket     text        not null,
  cle        text        not null,
  count      integer     not null default 0,
  reset_at   timestamptz not null,
  primary key (bucket, cle)
);

-- Table interne : seul service_role y accède. RLS activée sans policy de
-- lecture = deny-all pour anon/authenticated.
alter table public.rate_limits enable row level security;

create policy "deny anon" on public.rate_limits
  for all to anon using (false) with check (false);

-- Purge des fenêtres expirées (voir le balayage opportuniste dans le RPC).
create index if not exists rate_limits_reset_at_idx on public.rate_limits (reset_at);

-- Consomme une unité du quota (bucket, clé). Atomique : l'upsert incrémente ou
-- réarme la fenêtre en une instruction.
--
-- Contrairement à l'implémentation mémoire, le compteur continue d'augmenter
-- au-delà du plafond sur les tentatives refusées. C'est sans effet sur la
-- fenêtre (reset_at n'est pas repoussé) et ça donne une trace du volume d'abus.
create or replace function public.consume_rate_limit(
  p_bucket    text,
  p_key       text,
  p_max       integer,
  p_window_ms integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now    timestamptz := now();
  v_window interval    := make_interval(secs => greatest(p_window_ms, 1000) / 1000.0);
  v_count  integer;
  v_reset  timestamptz;
begin
  insert into public.rate_limits as rl (bucket, cle, count, reset_at)
  values (p_bucket, p_key, 1, v_now + v_window)
  on conflict (bucket, cle) do update
    set count    = case when rl.reset_at <= v_now then 1 else rl.count + 1 end,
        reset_at = case when rl.reset_at <= v_now then v_now + v_window else rl.reset_at end
  returning rl.count, rl.reset_at into v_count, v_reset;

  -- Balayage opportuniste : ~1 appel sur 100 nettoie les fenêtres closes depuis
  -- plus d'un jour. Évite un cron dédié pour une table qui reste minuscule.
  if random() < 0.01 then
    delete from public.rate_limits where reset_at < v_now - interval '1 day';
  end if;

  return query select v_count <= p_max, greatest(p_max - v_count, 0), v_reset;
end;
$$;

revoke execute on function public.consume_rate_limit(text, text, integer, integer)
  from anon, authenticated, public;

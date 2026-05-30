-- Migration 033 — Atomicité du quota codes promos par adresse (suite Sprint U)
--
-- Audit 2026-05-30 : le quota `usage_max_par_adresse` était vérifié par une
-- lecture (countUsageParAdresse sur `commandes`) PUIS l'insert de la commande —
-- fenêtre de race : deux commandes concurrentes (même ban_id + même code)
-- pouvaient toutes deux passer le check avant qu'aucune ne soit insérée. La
-- migration 027 n'avait fermé la race que pour le compteur GLOBAL (usage_max),
-- pas pour le quota par adresse — critique pour les codes parrainage
-- (usage_max = null → seul le quota par adresse les protège).
--
-- Solution : un compteur dédié (code, adresse) + un RPC d'« upsert » atomique.
-- La consommation par adresse devient une seule instruction SQL (verrou de
-- ligne sur conflit), correcte pour n'importe quel plafond N.
--
-- Note sémantique : ce compteur ne décrémente PAS sur annulation de commande.
-- Une commande annulée continue donc de consommer le quota par adresse. C'est
-- volontaire et renforce l'anti-abus : empêche le schéma
-- commander → annuler → recommander pour re-farmer BIENVENUE10. Le compteur
-- global (codes_promos.usage_actuel) conserve sa propre sémantique.

create table if not exists public.code_usage_adresse (
  code_promo  text        not null,
  ban_id      text        not null,
  usage_count integer     not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (code_promo, ban_id)
);

-- Table interne : seul service_role (API serveur) y accède. RLS activée sans
-- policy = deny-all pour anon/authenticated.
alter table public.code_usage_adresse enable row level security;

-- Consume atomique : incrémente le compteur (code, adresse) si et seulement si
-- on reste sous le plafond `p_limit`. Retourne true si la consommation a réussi
-- (sous plafond), false sinon. `p_limit` null = illimité (jamais passé par
-- l'appelant qui court-circuite, mais garde-fou conservé).
create or replace function public.try_consume_address_usage(
  p_code   text,
  p_ban_id text,
  p_limit  integer
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_count integer;
begin
  if p_limit is null then
    return true;
  end if;

  insert into public.code_usage_adresse as cua (code_promo, ban_id, usage_count, updated_at)
    values (p_code, p_ban_id, 1, now())
  on conflict (code_promo, ban_id) do update
    set usage_count = cua.usage_count + 1,
        updated_at  = now()
    where cua.usage_count < p_limit
  returning cua.usage_count into new_count;

  -- Pas de ligne retournée (le WHERE du ON CONFLICT a échoué) = plafond atteint.
  return new_count is not null;
end;
$$;

revoke execute on function public.try_consume_address_usage(text, text, integer) from anon, authenticated;

-- Décrément best-effort : utilisé pour relâcher une réservation par adresse
-- si la consommation du compteur global échoue juste après (race rare sur les
-- codes à plafond global), afin de ne pas « brûler » un usage adresse pour une
-- commande qui n'a finalement pas appliqué le code.
create or replace function public.release_address_usage(
  p_code   text,
  p_ban_id text
)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.code_usage_adresse
    set usage_count = greatest(usage_count - 1, 0),
        updated_at  = now()
    where code_promo = p_code and ban_id = p_ban_id;
$$;

revoke execute on function public.release_address_usage(text, text) from anon, authenticated;

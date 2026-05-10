-- Migration 024 — Compteur d'usage atomique pour les codes promos
--
-- Problème : `incrementCodeUsage` faisait un read-then-write côté JS,
-- non atomique. Deux commandes concurrentes utilisant un même code
-- `usage_max=1` (ex. codes MERCI parrainage) pouvaient toutes deux
-- passer la check `usage_actuel < usage_max` puis l'incrémenter à 1
-- au lieu de 2 → contournement du plafond.
--
-- Solution : RPC Postgres `increment_code_usage(uuid)` qui fait un
-- UPDATE atomique avec `usage_actuel = usage_actuel + 1`. La fonction
-- est SECURITY INVOKER (pas DEFINER) — l'appel passe par la service
-- role côté serveur, donc pas besoin d'élever les privilèges. EXECUTE
-- révoqué pour anon/authenticated par sécurité.

create or replace function public.increment_code_usage(code_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.codes_promos
  set usage_actuel = usage_actuel + 1
  where id = code_id;
$$;

revoke execute on function public.increment_code_usage(uuid) from anon, authenticated;

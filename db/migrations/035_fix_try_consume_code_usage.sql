-- Migration 035 — Fix try_consume_code_usage (bug type boolean/integer)
--
-- Bug (introduit migration 027) : la fonction déclarait `consumed boolean`,
-- y assignait ROW_COUNT (entier) via GET DIAGNOSTICS, puis évaluait
-- `consumed > 0`. Postgres lève alors à l'exécution :
--   « operator does not exist: boolean > integer ».
-- Conséquence : tryConsumeCodeUsage() attrapait l'erreur et renvoyait false
-- → AUCUN code promo ne s'appliquait jamais (quota adresse réservé puis
-- relâché, message « code épuisé entre-temps » affiché au client).
--
-- Correctif : variable entière pour le row_count, comparaison entière.

create or replace function public.try_consume_code_usage(code_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  affected integer;
begin
  update public.codes_promos
  set usage_actuel = usage_actuel + 1
  where id = code_id
    and actif = true
    and (expire_at is null or expire_at > now())
    and (usage_max is null or usage_actuel < usage_max);

  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

revoke execute on function public.try_consume_code_usage(uuid) from anon, authenticated;

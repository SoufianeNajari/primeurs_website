-- Migration 027 — Check+increment atomique des codes promos + tracking emails
--
-- Sprint T2 (audit complet 2026-05-14).
--
-- 1. RPC `try_consume_code_usage(uuid)` : alternative atomique à
--    `increment_code_usage` qui *check* le plafond avant d'incrémenter.
--    Élimine la race condition `validateCodePromo` (lecture) puis
--    `incrementCodeUsage` (écriture) sur les codes `usage_max=1`
--    (typiquement codes MERCI parrainage) : deux commandes concurrentes
--    pouvaient toutes deux valider puis incrémenter à 1 au lieu de 2.
--
-- 2. Tracking emails : colonnes `email_client_sent_at` et `email_shop_sent_at`
--    sur `commandes`. Permet à l'admin de voir quels clients n'ont PAS
--    reçu leur confirmation (Resend down, quota, domaine non vérifié) et
--    de relancer manuellement depuis /admin/orders.

-- 1. Try-consume atomique : retourne true si l'usage a pu être incrémenté
--    (plafond pas atteint), false sinon. Inclut aussi la check `actif`
--    et l'expiration pour fermer la fenêtre entre validation et insert.
create or replace function public.try_consume_code_usage(code_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  consumed boolean;
begin
  update public.codes_promos
  set usage_actuel = usage_actuel + 1
  where id = code_id
    and actif = true
    and (expire_at is null or expire_at > now())
    and (usage_max is null or usage_actuel < usage_max);

  get diagnostics consumed = row_count;
  return consumed > 0;
end;
$$;

revoke execute on function public.try_consume_code_usage(uuid) from anon, authenticated;

-- 2. Tracking emails commandes
alter table public.commandes
  add column if not exists email_client_sent_at timestamptz,
  add column if not exists email_shop_sent_at timestamptz,
  add column if not exists email_last_error text;

-- Index partiel pour surfacer rapidement les commandes en échec côté admin.
create index if not exists commandes_email_failed_idx
  on public.commandes (created_at desc)
  where email_client_sent_at is null
     or email_shop_sent_at is null;

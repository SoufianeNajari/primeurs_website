-- Migration 039 — Rend son code promo au client quand la commande est annulée
--
-- Audit 2026-08-07. Aujourd'hui les deux compteurs (global
-- `codes_promos.usage_actuel` et par adresse `code_usage_adresse`) sont
-- consommés AVANT l'insert de la commande et ne sont jamais relâchés :
--   - si l'insert échoue (500), le client n'a pas de commande mais son code est
--     brûlé ;
--   - si la commande est annulée, idem — or RENTREE10 est plafonné à 1 usage
--     par adresse, donc un client qui annule via le lien que le site lui envoie
--     lui-même dans l'email J-1 perd définitivement son offre de rentrée.
--
-- Révision de la note sémantique de la migration 033 (« ce compteur ne
-- décrémente PAS sur annulation, c'est volontaire, ça empêche
-- commander → annuler → recommander pour re-farmer BIENVENUE10 ») : la crainte
-- ne tient pas à l'examen. Le paiement se fait à la livraison, la remise ne se
-- matérialise donc que sur une commande LIVRÉE, et une commande déjà « retirée »
-- ne peut pas être annulée (409 côté /api/order/cancel). Le cycle
-- annuler/recommander ne rapporte rien : il déplace la remise, il ne la
-- duplique pas. Le coût de la sémantique actuelle est réel (offre perdue) et le
-- bénéfice imaginaire.

-- 1. Décrément du compteur global, symétrique de try_consume_code_usage (027).
--    Prend le code TEXTUEL et non l'id : c'est ce que `commandes.code_promo`
--    stocke, et un code supprimé/renommé entre-temps doit simplement ne rien
--    faire plutôt que planter. greatest(...,0) : jamais de compteur négatif.
create or replace function public.release_code_usage(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.codes_promos
     set usage_actuel = greatest(usage_actuel - 1, 0)
   where code = p_code;
$$;

revoke execute on function public.release_code_usage(text) from anon, authenticated, public;

-- 2. Verrou d'idempotence porté par la commande elle-même.
--    L'annulation peut arriver par trois chemins (lien signé client, PATCH
--    admin, et re-PATCH après un aller-retour de statut) : sans ce marqueur,
--    deux passages décrémenteraient deux fois pour une seule commande.
--    NULL = les compteurs de cette commande sont toujours consommés.
alter table public.commandes
  add column if not exists code_promo_libere_at timestamptz;

comment on column public.commandes.code_promo_libere_at is
  'Horodate la restitution des compteurs de code promo (global + par adresse) à l''annulation. NULL = compteurs encore consommés. Sert de verrou d''idempotence, voir /api/order/cancel et /api/orders/[id].';

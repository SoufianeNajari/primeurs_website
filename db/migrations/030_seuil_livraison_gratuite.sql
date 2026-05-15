-- Migration 030 — Seuil livraison gratuite
--
-- Ajoute `seuil_livraison_gratuite_cents` à `parametres` :
--   - Si le sous-total panier (avant code promo) atteint ce seuil,
--     les frais de livraison passent à 0 côté serveur (cf. /api/order).
--   - Côté client, alimente la barre de progression du CartDrawer/checkout.
--
-- Valeur initiale 5000 (= 50 €). Éditable via /admin/parametres ou SQL.

insert into public.parametres (cle, valeur)
  values ('seuil_livraison_gratuite_cents', '5000'::jsonb)
  on conflict (cle) do nothing;

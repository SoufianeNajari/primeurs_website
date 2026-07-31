-- 036 — Code promo « offre de rentrée » 2026
-- 10 € offerts dès 50 € d'achat, 1 usage par adresse de livraison.
-- Annoncé sur le bandeau boutique pendant la pause estivale (réouverture 25/08).

insert into codes_promos (
  code,
  type,
  valeur,
  reduction_max_cents,
  min_panier_cents,
  usage_max,
  actif,
  description,
  est_parrainage,
  usage_max_par_adresse
)
values (
  'RENTREE',
  'montant_fixe',
  1000,
  null,
  5000,
  null,
  true,
  'Offre de rentrée 2026 — 10 € offerts dès 50 € d''achat',
  false,
  1
)
on conflict (code) do nothing;

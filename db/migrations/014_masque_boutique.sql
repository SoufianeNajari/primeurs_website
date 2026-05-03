-- Migration 014 — Champ « masqué de la boutique »
--
-- Permet de retirer entièrement un produit hors saison de la boutique
-- (différent de `disponible=false` qui le garde visible mais grisé).
-- Côté admin, activer ce flag force aussi `disponible=false` pour cohérence.

alter table public.produits
  add column if not exists masque_boutique boolean not null default false;

create index if not exists produits_masque_boutique_idx
  on public.produits (masque_boutique)
  where masque_boutique = false;

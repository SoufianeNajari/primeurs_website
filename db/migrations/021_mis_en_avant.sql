-- Migration 021 — Champ « mis en avant » (coup de cœur du primeur)
--
-- Pilote :
--  - la section « Coups de cœur du primeur » sur la home (remplace l'ancienne
--    sélection auto par saison)
--  - les suggestions up-sell sur /order
--
-- Levier curatorial unique : le primeur coche les produits qu'il veut pousser
-- (marges hautes, fromages affinés, fruits différenciants…). Pas de fallback
-- automatique : si rien n'est coché, les sections concernées disparaissent.

alter table public.produits
  add column if not exists mis_en_avant boolean not null default false;

create index if not exists produits_mis_en_avant_idx
  on public.produits (mis_en_avant)
  where mis_en_avant = true;

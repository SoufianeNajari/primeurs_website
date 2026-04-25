-- Migration 005 — options de commande par produit
--
-- Remplace le couple (prix_kg, unite) sur produits par une liste d'options
-- de commande : [{id, libelle, prix}, ...]. Chaque produit doit avoir au
-- moins une option. Le libellé absorbe ce que faisait `unite` ("au kg",
-- "à la pièce", "la barquette"...). Le prix reste optionnel (pesée finale).

-- 1. Colonne options jsonb (non-null, default [])
alter table public.produits
  add column if not exists options jsonb not null default '[]'::jsonb;

-- 2. Backfill : 1 option par produit depuis (prix_kg, unite)
--    Libellé mappé vers la forme naturelle FR
update public.produits
set options = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'libelle', case
      when unite is null or unite = '' or lower(unite) = 'kg' then 'au kg'
      when lower(unite) = 'piece' or lower(unite) = 'pièce' then 'à la pièce'
      when lower(unite) = 'l' or lower(unite) = 'litre' then 'au litre'
      when lower(unite) = 'botte' then 'la botte'
      when lower(unite) = 'barquette' then 'la barquette'
      when lower(unite) = 'bouquet' then 'le bouquet'
      else 'la ' || unite
    end,
    'prix', prix_kg
  )
)
where jsonb_array_length(options) = 0;

-- 3. Contrainte : au moins 1 option par produit
alter table public.produits
  drop constraint if exists produits_options_non_vide;
alter table public.produits
  add constraint produits_options_non_vide
  check (jsonb_array_length(options) >= 1);

-- 4. Drop des colonnes remplacées
alter table public.produits drop column if exists prix_kg;
alter table public.produits drop column if exists unite;

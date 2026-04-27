-- Migration 012 — Sprint I2 : catégories en table dédiée
--
-- Permet au père d'ajouter / renommer / réordonner les catégories sans dev.
-- On garde produits.categorie text en parallèle (sync app-side au upsert)
-- car les commandes archivées contiennent un snapshot `categorie: string`
-- dans leurs lignes JSONB — pas la peine de migrer l'historique.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nom text not null,
  emoji text,
  ordre int not null default 0,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Backfill depuis valeurs distinctes existantes
insert into public.categories (slug, nom, ordre)
select
  trim(both '-' from lower(regexp_replace(unaccent(categorie), '[^a-zA-Z0-9]+', '-', 'g'))) as slug,
  categorie as nom,
  (row_number() over (order by categorie)) as ordre
from (select distinct categorie from public.produits where categorie is not null and categorie <> '') c
on conflict (slug) do nothing;

-- Lien produits → catégories (nullable, ON DELETE SET NULL pour éviter cascade destructive)
alter table public.produits
  add column if not exists categorie_id uuid references public.categories(id) on delete set null;

update public.produits p
  set categorie_id = c.id
  from public.categories c
  where c.nom = p.categorie and p.categorie_id is null;

create index if not exists produits_categorie_id_idx on public.produits(categorie_id);

-- RLS : anon peut lire les catégories actives uniquement
alter table public.categories enable row level security;
drop policy if exists categories_anon_read on public.categories;
create policy categories_anon_read on public.categories for select using (actif = true);

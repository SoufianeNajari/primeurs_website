-- Sprint 1.1 — Enrichissement de la table produits
-- Ajoute les colonnes nécessaires à la fiche produit : slug, images, description longue,
-- origine, conseils de conservation, certification bio, plage de saison, unité de vente.

alter table produits add column if not exists slug text;
alter table produits add column if not exists image_url text;
alter table produits add column if not exists images text[] default '{}';
alter table produits add column if not exists description_longue text;
alter table produits add column if not exists origine text;
alter table produits add column if not exists conseils_conservation text;
alter table produits add column if not exists bio boolean default false;
alter table produits add column if not exists mois_debut integer;
alter table produits add column if not exists mois_fin integer;
alter table produits add column if not exists unite text default 'kg';

-- Contraintes de domaine sur la plage de saison (1-12, null = toute l'année)
alter table produits drop constraint if exists produits_mois_debut_check;
alter table produits add constraint produits_mois_debut_check
  check (mois_debut is null or (mois_debut between 1 and 12));
alter table produits drop constraint if exists produits_mois_fin_check;
alter table produits add constraint produits_mois_fin_check
  check (mois_fin is null or (mois_fin between 1 and 12));

-- Fonction de slug (unaccent + kebab-case). Nécessite l'extension unaccent.
create extension if not exists unaccent;

create or replace function produits_slugify(input text) returns text
language sql immutable as $$
  select trim(both '-' from
    regexp_replace(
      lower(unaccent(input)),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

-- Backfill slug sur les lignes existantes
update produits set slug = produits_slugify(nom) where slug is null;

-- Index unique sur slug
create unique index if not exists produits_slug_key on produits(slug);

-- Saisonnalité par défaut pour les produits seed (à ajuster ensuite via admin)
update produits set mois_debut = 5,  mois_fin = 7  where lower(nom) like '%fraise%'    and mois_debut is null;
update produits set mois_debut = 6,  mois_fin = 10 where lower(nom) like '%tomate%'    and mois_debut is null;
update produits set mois_debut = 9,  mois_fin = 3  where lower(nom) like '%pomme%' and lower(nom) not like '%terre%' and mois_debut is null;
update produits set mois_debut = 9,  mois_fin = 2  where lower(nom) like '%poire%'     and mois_debut is null;
update produits set mois_debut = 11, mois_fin = 3  where lower(nom) like '%orange%'    and mois_debut is null;
update produits set mois_debut = 5,  mois_fin = 10 where lower(nom) like '%courgette%' and mois_debut is null;
update produits set mois_debut = 5,  mois_fin = 10 where lower(nom) like '%salade%'    and mois_debut is null;

-- Indexation par catégorie pour les listings filtrés
create index if not exists produits_categorie_idx on produits(categorie);

-- =============================================================================
-- Table commandes (schéma manquant du seed original, inféré depuis /api/order)
-- =============================================================================
create table if not exists commandes (
  id uuid primary key default gen_random_uuid(),
  client_nom text not null,
  client_email text not null,
  client_telephone text not null,
  lignes jsonb not null,
  message text,
  statut text not null default 'reçue',
  created_at timestamptz not null default now()
);

alter table commandes drop constraint if exists commandes_statut_check;
alter table commandes add constraint commandes_statut_check
  check (statut in ('reçue', 'prête', 'retirée', 'annulée'));

create index if not exists commandes_created_at_idx on commandes(created_at desc);
create index if not exists commandes_statut_idx on commandes(statut);

alter table commandes enable row level security;
-- Seul le service_role (API serveur) peut lire/écrire. Aucune policy publique.

-- =============================================================================
-- Bucket Storage pour les images produits
-- À exécuter séparément dans le dashboard Supabase si `storage.buckets` n'est
-- pas accessible en SQL selon le plan. Voir docs/SUPABASE_SETUP.md.
-- =============================================================================
insert into storage.buckets (id, name, public)
  values ('products-images', 'products-images', true)
  on conflict (id) do nothing;

-- Lecture publique du bucket
drop policy if exists "Public read products-images" on storage.objects;
create policy "Public read products-images" on storage.objects
  for select using (bucket_id = 'products-images');

-- Écriture réservée au service_role (les uploads passent par l'API admin)
drop policy if exists "Service role write products-images" on storage.objects;
create policy "Service role write products-images" on storage.objects
  for all using (bucket_id = 'products-images' and auth.role() = 'service_role');

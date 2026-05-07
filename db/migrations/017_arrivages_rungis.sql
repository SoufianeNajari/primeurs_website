-- Migration 017 — Sprint Q1.4 : "Ce matin à Rungis"
--
-- Table arrivages_rungis (singleton de fait) : photo + 3 produits phares
-- mis en avant sur la home pour matérialiser la promesse "sélection à
-- Rungis le matin même". Un seul actif à la fois — l'admin remplace en
-- publiant un nouveau, ce qui désactive le précédent.
--
-- Storage : bucket public 'arrivages' pour les photos, lecture publique,
-- écriture via service_role (admin bypass RLS).

create table if not exists public.arrivages_rungis (
  id uuid primary key default gen_random_uuid(),
  photo_url text not null,
  produit_1 text,
  produit_2 text,
  produit_3 text,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists arrivages_rungis_actif_recent_idx
  on public.arrivages_rungis (created_at desc) where actif = true;

alter table public.arrivages_rungis enable row level security;

create policy "arrivages_rungis lecture publique des actifs"
  on public.arrivages_rungis for select
  using (actif = true);

-- Pas de policy write : seul service_role (API admin) écrit.

-- Bucket Storage public pour les photos
insert into storage.buckets (id, name, public)
values ('arrivages', 'arrivages', true)
on conflict (id) do nothing;

-- Lecture publique des objets du bucket
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'arrivages public read'
  ) then
    create policy "arrivages public read" on storage.objects
      for select using (bucket_id = 'arrivages');
  end if;
end $$;

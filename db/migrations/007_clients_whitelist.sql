-- Migration 007 — whitelist clients par téléphone
--
-- Ajoute :
--   - clients_autorises : numéros whitelistés (format E.164, ex: +33612345678)
--   - access_requests   : demandes d'accès reçues sur /connexion
--   - commandes.client_id : FK nullable vers clients_autorises (historique préservé)
--
-- Pas d'accès anon : tout passe par service_role (admin) ou par les API
-- routes qui valident la session iron-session côté serveur.

-- 1. Whitelist
create table if not exists public.clients_autorises (
  id uuid primary key default gen_random_uuid(),
  telephone text not null unique,
  prenom text,
  nom text,
  email text,
  actif boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_autorises_actif_idx
  on public.clients_autorises(actif)
  where actif = true;

alter table public.clients_autorises enable row level security;
-- Aucune policy : seul service_role peut accéder.

-- 2. Demandes d'accès
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  telephone text not null,
  prenom text,
  nom text,
  email text,
  message text,
  statut text not null default 'en_attente'
    check (statut in ('en_attente','approuvee','refusee')),
  created_at timestamptz not null default now()
);

create index if not exists access_requests_statut_idx
  on public.access_requests(statut, created_at desc);

alter table public.access_requests enable row level security;
-- Aucune policy : seul service_role.

-- 3. Lien commande → client (nullable, historique préservé)
alter table public.commandes
  add column if not exists client_id uuid
  references public.clients_autorises(id) on delete set null;

create index if not exists commandes_client_id_idx
  on public.commandes(client_id)
  where client_id is not null;

-- 4. Trigger updated_at sur clients_autorises
create or replace function public.clients_autorises_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_autorises_updated_at on public.clients_autorises;
create trigger clients_autorises_updated_at
  before update on public.clients_autorises
  for each row execute function public.clients_autorises_set_updated_at();

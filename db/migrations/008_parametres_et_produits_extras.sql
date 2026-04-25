-- Migration 008 — Paramètres globaux + champs produits supplémentaires
--
-- 1. Table parametres (clé/valeur jsonb) pour les réglages globaux du site
--    (ex: blocage des commandes). Choix d'une table key/value plutôt qu'une
--    colonne dédiée pour rester extensible sans migration à chaque nouveau
--    réglage.
-- 2. Produits : trois nouveaux champs
--    - local      : slider admin (remplace la déduction par regex sur l'origine)
--    - variete    : texte libre, affiché dans la liste (ex: "Golden")
--    - qualite    : texte libre, affiché uniquement sur la fiche produit

create table if not exists public.parametres (
  cle text primary key,
  valeur jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.parametres enable row level security;
-- Aucune policy : seul service_role accède (les lectures publiques passent par
-- des routes API ou par les pages serveur via supabaseAdmin).

create or replace function public.parametres_set_updated_at()
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

drop trigger if exists parametres_updated_at on public.parametres;
create trigger parametres_updated_at
  before update on public.parametres
  for each row execute function public.parametres_set_updated_at();

-- Valeur par défaut pour le blocage des commandes
insert into public.parametres (cle, valeur)
  values ('commandes_bloquees', 'false'::jsonb)
  on conflict (cle) do nothing;

-- Produits : nouveaux champs
alter table public.produits add column if not exists local boolean not null default false;
alter table public.produits add column if not exists variete text;
alter table public.produits add column if not exists qualite text;

-- Backfill `local` à partir de l'ancienne logique de déduction par origine.
-- On exclut volontairement "France" seul : désormais, le badge France est
-- distinct du badge Local, qui ne concerne plus que les régions proches.
update public.produits
  set local = true
  where local = false
    and origine is not null
    and origine ~* 'essonne|île-de-france|ile-de-france|seine-et-marne';

-- Migration 009 — Sprint H1 : suivi de la fraîcheur des prix
--
-- Ajoute `prix_updated_at` sur produits, bumpé automatiquement par trigger
-- dès que la colonne `options` change (jsonb : `IS DISTINCT FROM` compare
-- la valeur normalisée, pas le texte). Permet d'afficher une pastille
-- vert/jaune/rouge dans la page admin "Prix du jour".

alter table public.produits
  add column if not exists prix_updated_at timestamptz not null default now();

create or replace function public.produits_set_prix_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.options is distinct from old.options then
    new.prix_updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists produits_prix_updated_at on public.produits;
create trigger produits_prix_updated_at
  before update on public.produits
  for each row execute function public.produits_set_prix_updated_at();

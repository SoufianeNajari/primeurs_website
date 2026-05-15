-- Migration 031 — Ingrédients de recette par article (cross-selling blog)
--
-- Permet d'attacher à un article (typiquement une recette) une liste
-- d'ingrédients = produits du catalogue avec une quantité de référence
-- pour 4 personnes. Le front affiche la liste sous l'article avec un
-- slider portions (1/2/4/6) et un bouton « Ajouter au panier » qui
-- pousse les lignes correspondantes dans le panier.
--
-- Modélisation :
--   - Table de jointure (article_id, produit_id) PK composite : un même
--     produit n'apparaît qu'une fois par recette.
--   - `quantite_kg_4pers` numeric(6,3) : nombre de kg pour 4 personnes
--     (l'arrondi au pas du sachet — 0,25 kg — est fait côté front à
--     l'application du slider portions).
--   - `ordre` smallint : position d'affichage stable.
--   - ON DELETE CASCADE des deux côtés : si l'article ou le produit
--     est supprimé, on nettoie les lignes orphelines.
--
-- RLS : lecture publique (la liste est utilisée par le rendu blog
-- côté serveur via service_role mais aussi exposable au cas où) ;
-- écriture service_role uniquement.

create table if not exists public.article_ingredients (
  article_id uuid not null references public.articles(id) on delete cascade,
  produit_id uuid not null references public.produits(id) on delete cascade,
  quantite_kg_4pers numeric(6,3) not null check (quantite_kg_4pers > 0 and quantite_kg_4pers <= 50),
  ordre smallint not null default 0,
  primary key (article_id, produit_id)
);

create index if not exists article_ingredients_article_idx
  on public.article_ingredients (article_id, ordre);

alter table public.article_ingredients enable row level security;

drop policy if exists "article_ingredients_public_read" on public.article_ingredients;
create policy "article_ingredients_public_read"
  on public.article_ingredients for select
  to anon, authenticated
  using (true);

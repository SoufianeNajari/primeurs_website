-- Sprint 4.3 — Blog / recettes
-- Articles associés à des produits (recettes, conseils de saison, idées d'accords).
-- Publication contrôlée via `published_at` (NULL = brouillon, date future = programmé).

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titre text not null,
  extrait text,
  contenu_md text not null default '',
  image_url text,
  produits_lies text[] not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_published_at_idx on articles (published_at desc);
create index if not exists articles_produits_lies_idx on articles using gin (produits_lies);

-- updated_at auto-refresh
create or replace function articles_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists articles_set_updated_at on articles;
create trigger articles_set_updated_at
  before update on articles
  for each row execute function articles_set_updated_at();

-- RLS : lecture publique uniquement des articles publiés, écriture service_role.
alter table articles enable row level security;

drop policy if exists "articles_public_read_published" on articles;
create policy "articles_public_read_published"
  on articles for select
  to anon, authenticated
  using (published_at is not null and published_at <= now());

-- Migration 006 — snapshot des avis Google
--
-- Cristallise les avis Google Places en DB pour ne plus dépendre de l'API
-- en lecture (coût + quota). Une seule ligne (id='main') maintenue par
-- UPSERT depuis la route admin /api/admin/reviews/refresh ou un cron mensuel.

create table if not exists public.google_reviews_snapshot (
  id text primary key,
  rating numeric(2,1),
  user_rating_count integer not null default 0,
  reviews jsonb not null default '[]'::jsonb,
  place_url text,
  refreshed_at timestamptz not null default now()
);

alter table public.google_reviews_snapshot enable row level security;

drop policy if exists "public read google reviews" on public.google_reviews_snapshot;
create policy "public read google reviews"
  on public.google_reviews_snapshot
  for select
  using (true);

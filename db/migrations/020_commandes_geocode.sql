-- Migration 020 — Sprint R3 (P1.3) : page admin tournée optimisée
--
-- Ajoute lat/lng sur commandes pour permettre :
--   - Le tri nearest-neighbor depuis le point de départ (boutique)
--   - L'affichage sur carte Leaflet/OSM
--
-- Géocodage via Nominatim (gratuit) en arrière-plan, mis en cache ici.

alter table public.commandes
  add column if not exists lat numeric(9,6),
  add column if not exists lng numeric(9,6);

create index if not exists commandes_geocode_pending_idx
  on public.commandes (date_livraison)
  where lat is null and lng is null and adresse is not null;

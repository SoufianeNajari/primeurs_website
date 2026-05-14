-- Migration 028 — Hygiène sécurité : unaccent dans extensions + buckets sans LIST
--
-- Sprint T4 (audit complet 2026-05-14). Solde 2 WARN advisor Supabase :
--
-- 1. `extension_in_public` : unaccent était dans le schema `public`.
--    On la déplace vers `extensions` et on rebase produits_slugify avec
--    un search_path multi-schema. La migration 025 avait reculé devant
--    ce changement — test transactionnel local confirme que le slug
--    "Crème fraîche épaisse" → "creme-fraiche-epaisse" reste correct.
--
-- 2. `public_bucket_allows_listing` (arrivages + products-images) :
--    les policies SELECT permissives `bucket_id = X` autorisaient anon
--    à énumérer les fichiers via l'API REST. Les URLs publiques
--    `/storage/v1/object/public/...` ne passent PAS par les policies RLS,
--    donc on peut DROP ces policies SELECT sans casser l'affichage.
--    L'app utilise uniquement `getPublicUrl()` (construction URL) et
--    `supabaseAdmin` côté serveur (bypass RLS via service_role).

-- 1. Move unaccent vers extensions
alter extension unaccent set schema extensions;
alter function public.produits_slugify(text) set search_path = public, extensions;

-- 2. Drop policies SELECT permissives (anti-listing)
drop policy if exists "Public read products-images" on storage.objects;
drop policy if exists "arrivages public read" on storage.objects;

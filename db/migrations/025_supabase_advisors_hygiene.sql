-- Migration 025 — Hygiène Supabase advisors
--
-- Fait suite à l'audit complet 2026-05-10. Adresse les WARN remontés par
-- `mcp__supabase__get_advisors` qui ne nécessitent pas de refonte
-- applicative.
--
-- ⚠️ NON traité ici :
--  - Move `unaccent` vers schema `extensions` : casserait `produits_slugify`
--    (utilisé par les triggers de slug). À refaire si on rebase la fonction
--    avec un search_path multi-schema.
--  - Bucket storage policies `arrivages` + `products-images` qui permettent
--    listing : à scoper via `name LIKE 'prefix/%'` après audit usage côté
--    client.

-- 1. REVOKE EXECUTE sur les triggers SECURITY DEFINER exposés
--    via PostgREST. Ces fonctions n'ont pas vocation à être appelées en RPC,
--    elles servent uniquement aux triggers `BEFORE UPDATE`.
revoke execute on function public.clients_autorises_set_updated_at() from anon, authenticated;
revoke execute on function public.parametres_set_updated_at() from anon, authenticated;

-- 2. Search path déterministe sur produits_slugify (public où vit
--    `unaccent`). Élimine le WARN function_search_path_mutable.
alter function public.produits_slugify(text) set search_path = public;

-- 3. Policies deny-all pour anon sur les tables RLS-enabled-no-policy.
--    Aucune route applicative n'utilise `supabasePublic` (anon key) sur
--    ces tables → on documente l'intent par une policy explicite, ce qui
--    fait taire le linter et formalise la défense en profondeur.
do $$
declare
  tname text;
begin
  for tname in
    select unnest(array['_migrations', 'access_requests', 'clients_autorises', 'commandes', 'parametres'])
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = tname and policyname = 'deny anon'
    ) then
      execute format(
        'create policy "deny anon" on public.%I for all to anon using (false) with check (false)',
        tname
      );
    end if;
  end loop;
end $$;

-- 4. Les permissions PUBLIC héritées masquaient le REVOKE ci-dessus :
--    PostgREST exposait toujours ces fonctions en RPC. On révoque explicitement
--    sur PUBLIC pour rendre les advisors silencieux.
revoke execute on function public.clients_autorises_set_updated_at() from public;
revoke execute on function public.parametres_set_updated_at() from public;

-- Migration 038 — Ferme la lecture publique de codes_promos
--
-- Audit 2026-08-07. La policy créée en 016 n'a pas de clause `to` : elle
-- s'applique donc au rôle `public`, anon compris — et la clé anon est publique
-- par construction (NEXT_PUBLIC_SUPABASE_ANON_KEY, présente dans le bundle
-- navigateur). N'importe qui pouvait faire
--     GET <SUPABASE_URL>/rest/v1/codes_promos?select=*
-- et récupérer :
--   - tous les codes actifs, y compris ceux qui ne sont pas annoncés
--     publiquement (codes MERCI de parrainage, codes de rattrapage) ;
--   - les colonnes `parrain_email` et `client_email_lock`, c'est-à-dire des
--     adresses email de clients — sujet RGPD autant que sujet fraude.
--
-- La justification d'origine (« permet la validation côté browser via
-- supabasePublic ») n'est plus vraie : plus aucun code applicatif ne lit
-- codes_promos avec la clé anon. Le client anon (`supabase` dans
-- lib/supabase.ts) ne sert qu'au realtime sur `produits` (CartContext,
-- CartDrawer, WelcomeBackBanner). La validation de code passe par
-- /api/codes-promos/validate, qui utilise supabaseAdmin (service role).

drop policy if exists "codes_promos lecture publique des codes actifs"
  on public.codes_promos;

-- Policies deny-all explicites pour anon, même intent et même forme qu'en 025 :
-- RLS activée sans policy suffit techniquement, la policy documente que c'est
-- délibéré et garde les advisors Supabase silencieux.
do $$
declare
  tname text;
begin
  for tname in
    select unnest(array['codes_promos', 'code_usage_adresse'])
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

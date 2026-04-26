-- Migration 010 — Sprint H2 : bornes de la fourchette client
--
-- Insère deux paramètres globaux dans `parametres` (cf. migration 008) :
--   - fourchette_min_pct : multiplicateur appliqué au sous-total estimé
--                          pour annoncer la borne basse (ex: 0.95 = -5%).
--   - fourchette_max_pct : idem pour la borne haute (ex: 1.10 = +10%).
-- Les valeurs sont stockées en jsonb (number) pour rester homogène avec
-- le reste de la table (cle/valeur jsonb). Modifiables via SQL/MCP sans
-- redéploiement.

insert into public.parametres (cle, valeur)
  values ('fourchette_min_pct', '0.95'::jsonb)
  on conflict (cle) do nothing;

insert into public.parametres (cle, valeur)
  values ('fourchette_max_pct', '1.10'::jsonb)
  on conflict (cle) do nothing;

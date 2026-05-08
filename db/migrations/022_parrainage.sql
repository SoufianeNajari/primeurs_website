-- Migration 022 — Parrainage croisé (Sprint S2.1)
--
-- Réutilise la table codes_promos existante en y ajoutant 3 colonnes :
--  - est_parrainage : flag pour distinguer codes manuels (BIENVENUE10) des
--    codes parrain auto-générés
--  - parrain_email : email du parrain qui a créé le code (null pour codes
--    manuels). Permet de retrouver les codes d'un parrain et d'éviter d'en
--    re-générer un à chaque commande du même client.
--  - client_email_lock : si renseigné, le code n'est validable que par ce
--    client. Utilisé pour les codes « MERCI » crédités au parrain quand un
--    filleul a utilisé son code.

alter table public.codes_promos
  add column if not exists est_parrainage boolean not null default false,
  add column if not exists parrain_email text,
  add column if not exists client_email_lock text;

create index if not exists codes_promos_parrain_email_idx
  on public.codes_promos (parrain_email)
  where parrain_email is not null;

create index if not exists codes_promos_client_email_lock_idx
  on public.codes_promos (client_email_lock)
  where client_email_lock is not null;

-- La policy de lecture publique existante reste compatible : un code locké
-- sur un email peut toujours être lu, c'est `validateCodePromo` côté serveur
-- qui rejettera si l'email ne correspond pas.

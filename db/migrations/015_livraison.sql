-- Migration 015 — Sprint O1 : pivot livraison à domicile
--
-- Ajoute les champs nécessaires à la livraison sur la table commandes.
-- On ne renomme pas date_retrait_souhaite : pour les nouvelles commandes
-- "Primeur Chez Vous", on utilise date_livraison + creneau_livraison.
-- Les commandes historiques restent intactes.
--
-- Frais et minimum sont pilotés via la table parametres (clé/valeur jsonb)
-- pour rester ajustables sans migration.

alter table public.commandes
  add column if not exists adresse text,
  add column if not exists code_postal text,
  add column if not exists ville text,
  add column if not exists complement_adresse text,
  add column if not exists creneau_livraison text,
  add column if not exists date_livraison date,
  add column if not exists frais_livraison_cents integer not null default 0;

-- Paramètres globaux livraison
insert into public.parametres (cle, valeur) values
  ('frais_livraison_cents', '0'::jsonb),
  ('min_commande_cents', '2000'::jsonb),
  ('cutoff_veille_heure', '18'::jsonb)
on conflict (cle) do nothing;

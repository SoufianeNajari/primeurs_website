-- Migration 019 — Sprint R2 (P1.5) : relance email J+14 sans commande
--
-- Ajoute la colonne `relance_j14_envoye_le` sur commandes pour tracker
-- l'envoi du mail de réactivation. Flag posé sur la (les) commande(s)
-- qui ont déclenché la relance d'un client donné — empêche les renvois
-- au prochain run du cron.
--
-- L'index partiel sert le job quotidien : il scanne uniquement les
-- commandes pas encore relancées et pas annulées.

alter table public.commandes
  add column if not exists relance_j14_envoye_le timestamptz;

create index if not exists commandes_relance_j14_pending_idx
  on public.commandes (created_at, client_email)
  where relance_j14_envoye_le is null and cancelled_at is null;

-- Migration 018 — Sprint Q1.1 : email rappel J-1 + annulation signée
--
-- Ajoute deux colonnes sur commandes :
--   - rappel_j1_envoye_le : marqueur idempotence du cron quotidien
--   - cancelled_at        : trace l'annulation (en + du statut texte 'annulée')
--
-- Le statut 'annulée' n'est pas contraint dans la BDD (la colonne statut
-- est text libre) : on l'ajoute simplement comme valeur tolérée par
-- l'application.

alter table public.commandes
  add column if not exists rappel_j1_envoye_le timestamptz,
  add column if not exists cancelled_at timestamptz;

create index if not exists commandes_rappel_j1_pending_idx
  on public.commandes (date_livraison)
  where rappel_j1_envoye_le is null and cancelled_at is null;

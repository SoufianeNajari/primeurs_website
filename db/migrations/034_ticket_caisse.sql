-- Migration 034 — Ticket de caisse (quantités + prix réels)
--
-- Contexte : les produits sont vendus au poids. Au moment de préparer la
-- commande, l'admin saisit la quantité RÉELLE pesée et le prix RÉEL par article.
-- On stocke ces lignes réelles pour générer un vrai ticket de caisse (PDF)
-- envoyable au client et téléchargeable côté admin.
--
--   - ticket_lignes : lignes réelles pesées, alignées sur `lignes`.
--       [{ produitId, optionId, nom, libelle,
--          quantite_reelle: number, prix_unitaire_reel: number }]
--       Le total du ticket (prix_final, migration 013) est recalculé côté
--       serveur = Σ(quantite_reelle × prix_unitaire_reel).
--   - ticket_sent_at : horodatage du dernier envoi du ticket au client.
--
-- Colonnes nullables → aucune donnée existante impactée.

alter table public.commandes
  add column if not exists ticket_lignes jsonb,
  add column if not exists ticket_sent_at timestamptz;

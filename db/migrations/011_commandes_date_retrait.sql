-- Migration 011 — Sprint H3 : date de retrait souhaitée
--
-- Champ optionnel : on ne le rend pas NOT NULL pour rester compatible avec les
-- commandes historiques. Les nouvelles commandes le peupleront depuis le
-- date picker du checkout (J+1 → J+14).

alter table public.commandes
  add column if not exists date_retrait_souhaite date;

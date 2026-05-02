-- Migration 013 — Sprint J7 : prix final ticket de caisse
--
-- Saisi par l'admin après retrait pour comparer avec le total estimé annoncé
-- au client. Nullable car les commandes anciennes / non retirées ne l'ont pas.

alter table public.commandes
  add column if not exists prix_final numeric(10, 2);

-- Migration 026 — Activer Supabase Realtime sur produits
--
-- Bug constaté 2026-05-14 : le canal `postgres_changes` dans CartContext
-- écoute les UPDATE de la table produits pour rafraîchir prix/dispo en
-- temps réel côté client. La publication `supabase_realtime` était
-- vide → aucun event n'était jamais émis. Quand le père modifiait un
-- prix, les clients en cours de navigation ne voyaient le nouveau prix
-- qu'au prochain reload (et seulement si /api/products répondait frais).
--
-- On ajoute produits à la publication. On garde l'identité de réplica par
-- défaut (pkey) : le payload `new` contient quand même la ligne complète
-- pour un UPDATE, donc options + disponible + masque_boutique sont
-- diffusés au client.

alter publication supabase_realtime add table public.produits;

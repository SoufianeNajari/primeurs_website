-- Migration 037 — Réalignement du code promo « offre de rentrée » + expiration
--
-- La migration 036 a créé le code sous le nom `RENTREE`. Il a ensuite été
-- renommé `RENTREE10` et plafonné à 50 usages directement en base (via
-- /admin/codes-promos), sans que le fichier 036 ne suive. Les trois bandeaux
-- boutique (BoutiqueFermee, BoutiquePauseBanner, CartDrawer) annoncent
-- `RENTREE10` : sur une base reconstruite depuis les migrations, le code créé
-- s'appellerait `RENTREE` et tous les clients se verraient refuser le code
-- affiché à l'écran. Cette migration réconcilie les deux.
--
-- 036 n'est volontairement PAS modifiée : scripts/migrate.js compare les hash
-- sha256 et refuse de rejouer une migration déjà appliquée dont le contenu a
-- changé — l'éditer ne produirait qu'un warning permanent.
--
-- Ajoute par la même occasion l'expiration manquante : l'offre est adossée à la
-- réouverture du 25/08 mais `expire_at` était null, donc valide indéfiniment
-- (seul le plafond de 50 usages l'aurait arrêtée).
--
-- Idempotente et correcte dans les deux états de départ : base de prod (code
-- déjà renommé) comme base reconstruite depuis 036 (code encore `RENTREE`).

-- 1. Renomme `RENTREE` → `RENTREE10`, sauf si la cible existe déjà.
update public.codes_promos
set code = 'RENTREE10'
where code = 'RENTREE'
  and not exists (
    select 1 from public.codes_promos c where c.code = 'RENTREE10'
  );

-- 2. Si un `RENTREE` subsiste, c'est un doublon (036 rejouée après le rename) :
--    on le désactive plutôt que de le supprimer, pour ne pas perdre son
--    compteur d'usages. Aucune FK ne pointe vers codes_promos.
update public.codes_promos
set actif = false
where code = 'RENTREE';

-- 3. Aligne les paramètres sur l'offre réellement annoncée.
--    expire_at = 1ᵉʳ octobre 00:00 heure de Paris, soit le 30 septembre inclus
--    dans sa totalité : lib/codes-promos.ts traite `expire_at <= now()` comme
--    expiré. (+02 = CEST, le passage à l'heure d'hiver 2026 est le 25 octobre.)
update public.codes_promos
set usage_max = 50,
    expire_at = timestamptz '2026-10-01 00:00:00+02'
where code = 'RENTREE10';

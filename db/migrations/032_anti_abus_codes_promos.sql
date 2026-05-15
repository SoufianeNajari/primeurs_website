-- Migration 032 — Anti-abus codes promos (Sprint U)
--
-- 1. ban_id sur commandes : identifiant canonique d'adresse fourni par la
--    Base Adresse Nationale (api-adresse.data.gouv.fr). Permet de comparer
--    deux adresses de manière fiable (le seul champ de la commande que le
--    livreur valide physiquement, donc le seul anti-fraude exploitable).
--
-- 2. usage_max_par_adresse sur codes_promos : plafonne l'utilisation d'un
--    même code à N fois pour le même ban_id. NULL = illimité.
--    Par défaut on initialise BIENVENUE10 et tous les codes parrainage
--    à 1 par adresse (un foyer = une utilisation).
--
-- 3. parrainage_max_merci_par_parrain dans parametres : plafond global de
--    codes MERCI crédités à un même email parrain. Défaut 5.
--
-- 4. merci_credite_at sur commandes : timestamp d'idempotence. Le crédit
--    MERCI est désormais déclenché à la livraison effective (statut
--    → retirée) et non plus au passage de commande. Cette colonne empêche
--    un double-crédit si l'admin re-clique sur le statut.

alter table public.commandes
  add column if not exists ban_id text,
  add column if not exists merci_credite_at timestamptz;

create index if not exists commandes_ban_id_idx
  on public.commandes (ban_id)
  where ban_id is not null;

alter table public.codes_promos
  add column if not exists usage_max_par_adresse integer;

-- Defaults raisonnables pour les codes existants : un foyer = 1 usage
update public.codes_promos
  set usage_max_par_adresse = 1
  where usage_max_par_adresse is null
    and (code = 'BIENVENUE10' or est_parrainage = true);

insert into public.parametres (cle, valeur)
  values ('parrainage_max_merci_par_parrain', '5'::jsonb)
  on conflict (cle) do nothing;

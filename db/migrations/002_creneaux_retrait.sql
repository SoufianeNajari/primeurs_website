-- Sprint 3.1 — Créneaux de retrait
-- On stocke jour + créneau horaire choisi pour chaque commande.
-- `jour_retrait` : texte libre (ex "Samedi 27 avril 2026") pour garder la souplesse actuelle.
-- `creneau_retrait` : plage horaire (ex "10h-12h").

alter table commandes add column if not exists jour_retrait text;
alter table commandes add column if not exists creneau_retrait text;

-- Migration 029 — Calibre produit (texte libre)
--
-- Ajoute un champ texte libre `calibre` sur `produits`. Le père y saisit
-- une indication de taille / pièces-au-kilo lisible client (ex : « 5 »,
-- « 4-5 / kg »). Affiché en boutique sous la variété et sur la fiche.
-- NULL = non renseigné (cas par défaut, rien d'affiché).

ALTER TABLE produits ADD COLUMN IF NOT EXISTS calibre TEXT NULL;

COMMENT ON COLUMN produits.calibre IS 'Texte libre indiquant le calibre ou le nombre de pièces par kg (ex: "5", "4-5 / kg"). NULL = non renseigné.';

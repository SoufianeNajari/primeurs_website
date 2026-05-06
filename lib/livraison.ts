// Configuration livraison "Primeur Chez Vous by Pontault Primeurs".
//
// Sources de vérité :
// - Villes desservies (8) : sélection 10-15 min voiture autour de Pontault.
// - Créneaux fixes hebdo (2) : Mardi 17h-19h et Samedi 15h-19h.
// - Cutoff : la veille à H heures (param BDD `cutoff_veille_heure`, défaut 18h).
// - Frais et min commande : params BDD (`frais_livraison_cents`, `min_commande_cents`).

import { getParam } from './parametres';

export type CreneauLivraison = {
  key: string;          // identifiant stable stocké en BDD
  jourSemaine: number;  // 0 = dimanche … 2 = mardi … 6 = samedi (Date.getDay)
  heureDebut: number;   // heure locale Europe/Paris
  heureFin: number;
  label: string;        // affichage UX
};

export const CRENEAUX_LIVRAISON: CreneauLivraison[] = [
  { key: 'mardi-17-19',  jourSemaine: 2, heureDebut: 17, heureFin: 19, label: 'Mardi 17h-19h' },
  { key: 'samedi-15-19', jourSemaine: 6, heureDebut: 15, heureFin: 19, label: 'Samedi 15h-19h' },
];

export type VilleLivraison = {
  nom: string;
  codePostal: string;
};

// 8 communes desservies (10-15 min voiture autour de Pontault-Combault).
export const VILLES_AUTORISEES: VilleLivraison[] = [
  { nom: 'Pontault-Combault',   codePostal: '77340' },
  { nom: 'Roissy-en-Brie',      codePostal: '77680' },
  { nom: 'Ozoir-la-Ferrière',   codePostal: '77330' },
  { nom: 'Lésigny',             codePostal: '77150' },
  { nom: 'Émerainville',        codePostal: '77184' },
  { nom: 'Le Plessis-Trévise',  codePostal: '94420' },
  { nom: 'Villiers-sur-Marne',  codePostal: '94350' },
  { nom: 'Noisy-le-Grand',      codePostal: '93160' },
];

export function isVilleAutorisee(nom: string): boolean {
  const norm = nom.trim().toLowerCase();
  return VILLES_AUTORISEES.some((v) => v.nom.toLowerCase() === norm);
}

export function getCreneauByKey(key: string): CreneauLivraison | undefined {
  return CRENEAUX_LIVRAISON.find((c) => c.key === key);
}

const PARAM_FRAIS = 'frais_livraison_cents';
const PARAM_MIN = 'min_commande_cents';
const PARAM_CUTOFF = 'cutoff_veille_heure';

export const DEFAULT_FRAIS_LIVRAISON_CENTS = 0;
export const DEFAULT_MIN_COMMANDE_CENTS = 2000;
export const DEFAULT_CUTOFF_VEILLE_HEURE = 18;

export async function getFraisLivraisonCents(): Promise<number> {
  return getParam<number>(PARAM_FRAIS, DEFAULT_FRAIS_LIVRAISON_CENTS);
}

export async function getMinCommandeCents(): Promise<number> {
  return getParam<number>(PARAM_MIN, DEFAULT_MIN_COMMANDE_CENTS);
}

export async function getCutoffVeilleHeure(): Promise<number> {
  return getParam<number>(PARAM_CUTOFF, DEFAULT_CUTOFF_VEILLE_HEURE);
}

// Calcule la prochaine date de livraison pour un créneau donné, en respectant
// le cutoff (veille à H heures). Si le cutoff de la prochaine occurrence est
// déjà passé, on saute à l'occurrence suivante.
//
// `now` accepté en paramètre pour testabilité.
export function nextDateForCreneau(
  creneau: CreneauLivraison,
  cutoffVeilleHeure: number,
  now: Date = new Date(),
): Date {
  const candidate = new Date(now);
  candidate.setHours(0, 0, 0, 0);

  for (let i = 0; i < 14; i++) {
    const day = (candidate.getDay() + 7) % 7;
    if (day === creneau.jourSemaine) {
      const cutoff = new Date(candidate);
      cutoff.setDate(cutoff.getDate() - 1);
      cutoff.setHours(cutoffVeilleHeure, 0, 0, 0);
      if (now < cutoff) return candidate;
    }
    candidate.setDate(candidate.getDate() + 1);
  }
  // Sécurité : ne devrait jamais arriver (un créneau hebdo est toujours dispo dans 14 j).
  return candidate;
}

export type CreneauOption = {
  creneau: CreneauLivraison;
  date: Date;
  iso: string; // YYYY-MM-DD pour stockage et envoi formulaire
};

export function listCreneauOptions(
  cutoffVeilleHeure: number,
  now: Date = new Date(),
): CreneauOption[] {
  return CRENEAUX_LIVRAISON.map((c) => {
    const date = nextDateForCreneau(c, cutoffVeilleHeure, now);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { creneau: c, date, iso };
  });
}

export function formatCreneauDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

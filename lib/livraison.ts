// Configuration livraison "Primeur Chez Vous by Pontault Primeurs".
//
// Sources de vérité :
// - Villes desservies (8) : sélection 10-15 min voiture autour de Pontault.
// - Créneaux fixes hebdo : Mardi et Vendredi, 3 créneaux de 2 h (15h-17h, 17h-19h, 19h-21h).
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
  { key: 'mardi-15-17',    jourSemaine: 2, heureDebut: 15, heureFin: 17, label: 'Mardi 15h-17h' },
  { key: 'mardi-17-19',    jourSemaine: 2, heureDebut: 17, heureFin: 19, label: 'Mardi 17h-19h' },
  { key: 'mardi-19-21',    jourSemaine: 2, heureDebut: 19, heureFin: 21, label: 'Mardi 19h-21h' },
  { key: 'vendredi-15-17', jourSemaine: 5, heureDebut: 15, heureFin: 17, label: 'Vendredi 15h-17h' },
  { key: 'vendredi-17-19', jourSemaine: 5, heureDebut: 17, heureFin: 19, label: 'Vendredi 17h-19h' },
  { key: 'vendredi-19-21', jourSemaine: 5, heureDebut: 19, heureFin: 21, label: 'Vendredi 19h-21h' },
];

export type VilleLivraison = {
  nom: string;
  codePostal: string;
  insee: string; // code INSEE commune — préfixe des identifiants BAN (ban_id)
};

// 8 communes desservies (10-15 min voiture autour de Pontault-Combault).
// `insee` vérifié via api-adresse.data.gouv.fr (type=municipality).
export const VILLES_AUTORISEES: VilleLivraison[] = [
  { nom: 'Pontault-Combault',   codePostal: '77340', insee: '77373' },
  { nom: 'Roissy-en-Brie',      codePostal: '77680', insee: '77390' },
  { nom: 'Ozoir-la-Ferrière',   codePostal: '77330', insee: '77350' },
  { nom: 'Lésigny',             codePostal: '77150', insee: '77249' },
  { nom: 'Émerainville',        codePostal: '77184', insee: '77169' },
  { nom: 'Le Plessis-Trévise',  codePostal: '94420', insee: '94059' },
  { nom: 'Villiers-sur-Marne',  codePostal: '94350', insee: '94079' },
  { nom: 'Noisy-le-Grand',      codePostal: '93160', insee: '93051' },
];

export function isVilleAutorisee(nom: string): boolean {
  const norm = nom.trim().toLowerCase();
  return VILLES_AUTORISEES.some((v) => v.nom.toLowerCase() === norm);
}

// Codes INSEE des communes desservies.
const SERVED_INSEE = new Set(VILLES_AUTORISEES.map((v) => v.insee));

// Re-validation serveur d'un identifiant BAN. Un ban_id de la Base Adresse
// Nationale s'écrit « <insee>_<voie>_<numero> » (ou plus court) : les 5 premiers
// chiffres sont le code INSEE de la commune. On vérifie que ce préfixe
// appartient à une commune desservie — sans faire confiance au champ `ville`
// envoyé par le client. Rejette les ban_id forgés (chaîne arbitraire) ou hors
// zone, et donc le contournement du quota par adresse via faux ban_id.
export function isBanIdServed(banId: string): boolean {
  const m = /^(\d{5})(?:_|$)/.exec(banId);
  return m != null && SERVED_INSEE.has(m[1]);
}

export function getCreneauByKey(key: string): CreneauLivraison | undefined {
  return CRENEAUX_LIVRAISON.find((c) => c.key === key);
}

const PARAM_FRAIS = 'frais_livraison_cents';
const PARAM_MIN = 'min_commande_cents';
const PARAM_CUTOFF = 'cutoff_veille_heure';
const PARAM_SEUIL_GRATUIT = 'seuil_livraison_gratuite_cents';

export const DEFAULT_FRAIS_LIVRAISON_CENTS = 0;
export const DEFAULT_MIN_COMMANDE_CENTS = 3000;
export const DEFAULT_CUTOFF_VEILLE_HEURE = 18;
// 0 = pas de seuil, livraison gratuite jamais déclenchée par le montant.
export const DEFAULT_SEUIL_LIVRAISON_GRATUITE_CENTS = 5500;

export async function getFraisLivraisonCents(): Promise<number> {
  return getParam<number>(PARAM_FRAIS, DEFAULT_FRAIS_LIVRAISON_CENTS);
}

export async function getMinCommandeCents(): Promise<number> {
  return getParam<number>(PARAM_MIN, DEFAULT_MIN_COMMANDE_CENTS);
}

export async function getCutoffVeilleHeure(): Promise<number> {
  return getParam<number>(PARAM_CUTOFF, DEFAULT_CUTOFF_VEILLE_HEURE);
}

export async function getSeuilLivraisonGratuiteCents(): Promise<number> {
  return getParam<number>(PARAM_SEUIL_GRATUIT, DEFAULT_SEUIL_LIVRAISON_GRATUITE_CENTS);
}

// Calcule les frais de livraison effectifs en fonction du sous-total
// panier (avant code promo). Si `seuilGratuitCents` est > 0 et que le
// sous-total l'atteint, retourne 0 ; sinon retourne `fraisCents`.
export function computeFraisLivraisonCents(
  sousTotalCents: number,
  fraisCents: number,
  seuilGratuitCents: number,
): number {
  if (seuilGratuitCents > 0 && sousTotalCents >= seuilGratuitCents) return 0;
  return fraisCents;
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

// Configuration des créneaux de retrait par jour de la semaine.
// Horaires boutique : Lun fermé · Mar-Ven 8h-19h30 · Sam 8h-19h · Dim 8h-13h.
// On propose 3 créneaux de 2 h, en évitant le pic 12h-14h.

export type Creneau = string; // ex "10h-12h"

const CRENEAUX_STANDARD: Creneau[] = ['09h-11h', '11h-13h', '15h-17h', '17h-19h'];
const CRENEAUX_SAMEDI: Creneau[]   = ['09h-11h', '11h-13h', '15h-17h', '17h-19h'];
const CRENEAUX_DIMANCHE: Creneau[] = ['09h-11h', '11h-13h'];

export const JOURS_RETRAIT: Array<{ key: string; label: string; creneaux: Creneau[] }> = [
  { key: 'mardi',    label: 'Mardi',    creneaux: CRENEAUX_STANDARD },
  { key: 'mercredi', label: 'Mercredi', creneaux: CRENEAUX_STANDARD },
  { key: 'jeudi',    label: 'Jeudi',    creneaux: CRENEAUX_STANDARD },
  { key: 'vendredi', label: 'Vendredi', creneaux: CRENEAUX_STANDARD },
  { key: 'samedi',   label: 'Samedi',   creneaux: CRENEAUX_SAMEDI },
  { key: 'dimanche', label: 'Dimanche', creneaux: CRENEAUX_DIMANCHE },
];

export function creneauxForJour(jourLabel: string): Creneau[] {
  const jour = JOURS_RETRAIT.find((j) => j.label === jourLabel || j.key === jourLabel.toLowerCase());
  return jour?.creneaux || CRENEAUX_STANDARD;
}

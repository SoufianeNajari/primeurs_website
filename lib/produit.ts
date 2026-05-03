export type ProduitOption = {
  id: string;
  libelle: string;
  prix?: number | null;
};

export type Product = {
  id: string;
  nom: string;
  categorie: string;
  disponible: boolean;
  masque_boutique?: boolean | null;
  slug?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  description?: string | null;
  description_longue?: string | null;
  origine?: string | null;
  conseils_conservation?: string | null;
  options: ProduitOption[];
  bio?: boolean | null;
  local?: boolean | null;
  variete?: string | null;
  qualite?: string | null;
  mois_debut?: number | null;
  mois_fin?: number | null;
  ordre?: number | null;
};

const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrixOption(opt: ProduitOption): string {
  if (opt.prix == null || Number.isNaN(Number(opt.prix))) return opt.libelle;
  return `${euro.format(Number(opt.prix))} ${opt.libelle}`;
}

export function formatPrixMontant(prix: number | null | undefined): string | null {
  if (prix == null || Number.isNaN(Number(prix))) return null;
  return euro.format(Number(prix));
}

// Sprint H : une option « poids incertain » est marquée par `prix === null`
// (option A simple, validée 2026-04-26). Le père laisse le champ vide pour
// les produits dont le prix sera fixé à la remise.
export function isPoidsIncertain(opt: { prix?: number | null }): boolean {
  return opt.prix == null;
}

export function cartHasPoidsIncertain(items: { prix?: number | null }[]): boolean {
  return items.some(isPoidsIncertain);
}

// Résumé prix pour listings.
// Règle : si une option « au kg » est tarifée, on l'affiche directement
// (sans « à partir de ») — c'est l'unité de référence du primeur. Sinon, on
// retombe sur la seule option tarifée s'il n'y en a qu'une (pièce, barquette,
// botte…), ou sur « à partir de X € » s'il y en a plusieurs.
export function formatPrixResume(options: ProduitOption[] | null | undefined): string | null {
  if (!options || options.length === 0) return null;

  const optionsAvecPrix = options.filter((o) => o.prix != null && !Number.isNaN(Number(o.prix)));
  if (optionsAvecPrix.length === 0) return null;

  const optionKg = optionsAvecPrix.find((o) => /\bkg\b|kilo/i.test(o.libelle));
  if (optionKg) return formatPrixOption(optionKg);

  if (optionsAvecPrix.length === 1) return formatPrixOption(optionsAvecPrix[0]);

  const min = Math.min(...optionsAvecPrix.map((o) => Number(o.prix)));
  return `à partir de ${euro.format(min)}`;
}

export function isEnSaison(mois_debut: number | null | undefined, mois_fin: number | null | undefined, month: number = new Date().getMonth() + 1): boolean {
  if (!mois_debut || !mois_fin) return false;
  // Plage qui traverse l'année (ex: octobre -> février)
  if (mois_debut <= mois_fin) {
    return month >= mois_debut && month <= mois_fin;
  }
  return month >= mois_debut || month <= mois_fin;
}

export type TagKind = 'bio' | 'saison' | 'local' | 'france';
export type Tag = { kind: TagKind; label: string; textColor: string };

export function isFranceOrigine(origine: string | null | undefined): boolean {
  return !!origine && /france/i.test(origine);
}

export function getProductTags(
  p: Pick<Product, 'bio' | 'local' | 'mois_debut' | 'mois_fin' | 'origine'>,
): Tag[] {
  const tags: Tag[] = [];
  if (p.bio) {
    tags.push({ kind: 'bio', label: 'Bio', textColor: 'text-green-700' });
  }
  if (isEnSaison(p.mois_debut, p.mois_fin)) {
    tags.push({ kind: 'saison', label: 'De saison', textColor: 'text-amber-700' });
  }
  if (p.local) {
    tags.push({ kind: 'local', label: 'Local', textColor: 'text-blue-700' });
  }
  if (isFranceOrigine(p.origine)) {
    tags.push({ kind: 'france', label: 'France', textColor: 'text-red-700' });
  }
  return tags;
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Suggestions d'options pour le form admin
export const OPTION_LIBELLES_SUGGESTIONS = [
  'au kg',
  'à la pièce',
  'la barquette',
  'la botte',
  'le bouquet',
  'au litre',
];

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
  slug?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  description?: string | null;
  description_longue?: string | null;
  origine?: string | null;
  conseils_conservation?: string | null;
  options: ProduitOption[];
  bio?: boolean | null;
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

// Résumé prix pour listings : 1 option → "3,50 € au kg" ; N options avec prix → "à partir de 1,20 €" ; sinon null
export function formatPrixResume(options: ProduitOption[] | null | undefined): string | null {
  if (!options || options.length === 0) return null;
  if (options.length === 1) {
    const only = options[0];
    if (only.prix == null) return null;
    return formatPrixOption(only);
  }
  const prix = options
    .map((o) => (o.prix == null ? null : Number(o.prix)))
    .filter((p): p is number => p != null && !Number.isNaN(p));
  if (prix.length === 0) return null;
  const min = Math.min(...prix);
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

export type TagKind = 'bio' | 'saison' | 'local';
export type Tag = { kind: TagKind; label: string; textColor: string };

export function getProductTags(p: Pick<Product, 'bio' | 'mois_debut' | 'mois_fin' | 'origine'>): Tag[] {
  const tags: Tag[] = [];
  if (p.bio) {
    tags.push({ kind: 'bio', label: 'Bio', textColor: 'text-green-700' });
  }
  if (isEnSaison(p.mois_debut, p.mois_fin)) {
    tags.push({ kind: 'saison', label: 'De saison', textColor: 'text-amber-700' });
  }
  if (p.origine && /france|essonne|île-de-france|ile-de-france|seine-et-marne/i.test(p.origine)) {
    tags.push({ kind: 'local', label: 'Local', textColor: 'text-blue-700' });
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

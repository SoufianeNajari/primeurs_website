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
  prix_kg?: number | null;
  bio?: boolean | null;
  mois_debut?: number | null;
  mois_fin?: number | null;
  unite?: string | null;
  ordre?: number | null;
};

const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrix(prix: number | null | undefined, unite: string | null | undefined = 'kg'): string | null {
  if (prix == null || Number.isNaN(Number(prix))) return null;
  return `${euro.format(Number(prix))} / ${unite || 'kg'}`;
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

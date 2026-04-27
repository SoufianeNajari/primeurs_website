import { supabase, supabaseAdmin } from './supabase';

export type Categorie = {
  id: string;
  slug: string;
  nom: string;
  emoji: string | null;
  ordre: number;
  actif: boolean;
};

export function slugifyCategorie(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function listCategoriesPublic(): Promise<Categorie[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, nom, emoji, ordre, actif')
    .eq('actif', true)
    .order('ordre', { ascending: true });
  if (error) {
    console.error('listCategoriesPublic', error);
    return [];
  }
  return data || [];
}

export async function listCategoriesAdmin(): Promise<Categorie[]> {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('id, slug, nom, emoji, ordre, actif')
    .order('ordre', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function findCategorieByNom(nom: string): Promise<Categorie | null> {
  const cleaned = nom.trim();
  if (!cleaned) return null;
  const slug = slugifyCategorie(cleaned);
  const { data } = await supabaseAdmin
    .from('categories')
    .select('id, slug, nom, emoji, ordre, actif')
    .or(`slug.eq.${slug},nom.eq.${cleaned}`)
    .maybeSingle();
  return data || null;
}

export async function findOrCreateCategorieByNom(nom: string): Promise<Categorie> {
  const cleaned = nom.trim();
  if (!cleaned) throw new Error('Nom catégorie vide');
  const slug = slugifyCategorie(cleaned);

  const { data: existing } = await supabaseAdmin
    .from('categories')
    .select('id, slug, nom, emoji, ordre, actif')
    .or(`slug.eq.${slug},nom.eq.${cleaned}`)
    .maybeSingle();
  if (existing) return existing;

  const { data: maxOrdre } = await supabaseAdmin
    .from('categories')
    .select('ordre')
    .order('ordre', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrdre = (maxOrdre?.ordre ?? 0) + 1;

  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert({ slug, nom: cleaned, ordre: nextOrdre })
    .select('id, slug, nom, emoji, ordre, actif')
    .single();
  if (error) throw error;
  return data;
}

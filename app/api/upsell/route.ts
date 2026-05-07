import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isEnSaison, type Product, type ProduitOption } from '@/lib/produit';

export const dynamic = 'force-dynamic';

// Renvoie jusqu'à 3 suggestions complémentaires pour le checkout.
// Stratégie : 1 fromage (différenciant), 1 produit de saison, 1 complément
// d'une catégorie absente du panier — pour ne pas pousser des doublons.

export type UpsellSuggestion = {
  id: string;
  nom: string;
  categorie: string;
  image_url: string | null;
  // Option par défaut sélectionnée pour quick-add. Préfère une option avec
  // prix défini ; sinon la première (sera affichée « à peser »).
  option: { id: string; libelle: string; prix: number | null };
};

type ProduitRow = Pick<Product, 'id' | 'nom' | 'categorie' | 'image_url' | 'mois_debut' | 'mois_fin' | 'ordre'> & {
  options: ProduitOption[] | null;
  disponible: boolean;
  masque_boutique: boolean | null;
};

function pickDefaultOption(opts: ProduitOption[] | null | undefined): ProduitSuggestion['option'] | null {
  if (!opts || opts.length === 0) return null;
  const withPrice = opts.find((o) => o.prix != null && !Number.isNaN(Number(o.prix)));
  const opt = withPrice || opts[0];
  return { id: opt.id, libelle: opt.libelle, prix: opt.prix == null ? null : Number(opt.prix) };
}

type ProduitSuggestion = UpsellSuggestion;

function toSuggestion(p: ProduitRow): UpsellSuggestion | null {
  const option = pickDefaultOption(p.options);
  if (!option) return null;
  return {
    id: p.id,
    nom: p.nom,
    categorie: p.categorie,
    image_url: p.image_url ?? null,
    option,
  };
}

export async function POST(request: NextRequest) {
  let excludeIds: string[] = [];
  let cartCategories: string[] = [];
  try {
    const body = await request.json();
    if (Array.isArray(body?.excludeIds)) {
      excludeIds = body.excludeIds.filter((x: unknown) => typeof x === 'string').slice(0, 50);
    }
    if (Array.isArray(body?.cartCategories)) {
      cartCategories = body.cartCategories.filter((x: unknown) => typeof x === 'string').slice(0, 20);
    }
  } catch {
    // body optionnel — on retourne des suggestions génériques
  }

  let query = supabaseAdmin
    .from('produits')
    .select('id, nom, categorie, image_url, mois_debut, mois_fin, ordre, options, disponible, masque_boutique')
    .eq('disponible', true)
    .or('masque_boutique.is.null,masque_boutique.eq.false');

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.map((id) => `"${id}"`).join(',')})`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[upsell] fetch error:', error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }

  const candidates = (data || []) as ProduitRow[];
  const usedIds = new Set<string>();
  const usedCategories = new Set<string>(cartCategories.map((c) => c.toLowerCase()));
  const suggestions: UpsellSuggestion[] = [];

  const isCategorie = (p: ProduitRow, slug: string) =>
    (p.categorie || '').toLowerCase().includes(slug);

  const sortByOrdre = (a: ProduitRow, b: ProduitRow) =>
    (a.ordre ?? 999) - (b.ordre ?? 999);

  const pickOne = (filter: (p: ProduitRow) => boolean) => {
    const found = candidates
      .filter((p) => !usedIds.has(p.id) && filter(p))
      .sort(sortByOrdre)[0];
    if (!found) return;
    const sug = toSuggestion(found);
    if (!sug) return;
    suggestions.push(sug);
    usedIds.add(found.id);
    usedCategories.add(found.categorie.toLowerCase());
  };

  // 1) Un fromage (différenciant fort)
  pickOne((p) => isCategorie(p, 'fromage'));

  // 2) Un produit de saison, hors catégories déjà couvertes (panier + fromages déjà ajouté)
  pickOne((p) => isEnSaison(p.mois_debut, p.mois_fin) && !usedCategories.has(p.categorie.toLowerCase()));

  // 3) Un complément d'une catégorie pas encore couverte
  pickOne((p) => !usedCategories.has(p.categorie.toLowerCase()));

  // Fallback : si on n'a pas 3 suggestions, on remplit avec n'importe quoi de dispo
  if (suggestions.length < 3) {
    for (const p of candidates.sort(sortByOrdre)) {
      if (suggestions.length >= 3) break;
      if (usedIds.has(p.id)) continue;
      const sug = toSuggestion(p);
      if (!sug) continue;
      suggestions.push(sug);
      usedIds.add(p.id);
    }
  }

  return NextResponse.json({ suggestions });
}

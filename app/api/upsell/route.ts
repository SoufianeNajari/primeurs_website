import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isValidUuid } from '@/lib/uuid';
import type { Product, ProduitOption } from '@/lib/produit';

export const dynamic = 'force-dynamic';

// Suggestions up-sell pour le checkout — pilotées par le flag `mis_en_avant`
// (« coups de cœur du primeur »). Le primeur coche manuellement les produits
// à mettre en avant : un seul levier curatorial, partagé avec la home.
//
// Mode strict : si rien n'est coché, on renvoie une liste vide. Pas de
// fallback aléatoire — on préfère masquer la section que pousser n'importe quoi.

export type UpsellSuggestion = {
  id: string;
  nom: string;
  categorie: string;
  image_url: string | null;
  option: { id: string; libelle: string; prix: number | null };
};

type ProduitRow = Pick<Product, 'id' | 'nom' | 'categorie' | 'image_url' | 'ordre'> & {
  options: ProduitOption[] | null;
};

function pickDefaultOption(opts: ProduitOption[] | null | undefined) {
  if (!opts || opts.length === 0) return null;
  const withPrice = opts.find((o) => o.prix != null && !Number.isNaN(Number(o.prix)));
  const opt = withPrice || opts[0];
  return { id: opt.id, libelle: opt.libelle, prix: opt.prix == null ? null : Number(opt.prix) };
}

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

// Tirage aléatoire sans remise (Fisher-Yates partiel).
function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function POST(request: NextRequest) {
  let excludeIds: string[] = [];
  try {
    const body = await request.json();
    if (Array.isArray(body?.excludeIds)) {
      // Filtre strict sur des UUID valides : ces ids sont interpolés dans un
      // filtre PostgREST `.not('id','in',...)` ; un id contenant " ou )
      // pourrait altérer la requête.
      excludeIds = body.excludeIds.filter((x: unknown) => isValidUuid(x)).slice(0, 50);
    }
  } catch {
    // body optionnel
  }

  let query = supabaseAdmin
    .from('produits')
    .select('id, nom, categorie, image_url, ordre, options')
    .eq('disponible', true)
    .eq('mis_en_avant', true)
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
  const suggestions = shuffle(candidates)
    .map(toSuggestion)
    .filter((s): s is UpsellSuggestion => s !== null)
    .slice(0, 3);

  return NextResponse.json({ suggestions });
}

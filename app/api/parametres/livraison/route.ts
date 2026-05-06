import { NextResponse } from 'next/server';
import {
  getFraisLivraisonCents,
  getMinCommandeCents,
  getCutoffVeilleHeure,
  DEFAULT_FRAIS_LIVRAISON_CENTS,
  DEFAULT_MIN_COMMANDE_CENTS,
  DEFAULT_CUTOFF_VEILLE_HEURE,
} from '@/lib/livraison';

// Cache CDN 5 min : ces paramètres changent rarement (admin SQL),
// pas besoin d'aller-retour DB à chaque ouverture du formulaire.
export const revalidate = 300;

export type LivraisonConfig = {
  fraisCents: number;
  minCents: number;
  cutoffHeure: number;
};

export async function GET() {
  try {
    const [fraisCents, minCents, cutoffHeure] = await Promise.all([
      getFraisLivraisonCents(),
      getMinCommandeCents(),
      getCutoffVeilleHeure(),
    ]);
    const payload: LivraisonConfig = { fraisCents, minCents, cutoffHeure };
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
    });
  } catch {
    const fallback: LivraisonConfig = {
      fraisCents: DEFAULT_FRAIS_LIVRAISON_CENTS,
      minCents: DEFAULT_MIN_COMMANDE_CENTS,
      cutoffHeure: DEFAULT_CUTOFF_VEILLE_HEURE,
    };
    return NextResponse.json(fallback, {
      headers: { 'Cache-Control': 'public, s-maxage=60' },
    });
  }
}

import { NextResponse } from 'next/server';
import { getFourchetteBornes, FOURCHETTE_DEFAULT } from '@/lib/fourchette';

// Cache CDN 5 min : les bornes changent rarement (uniquement via SQL admin),
// pas besoin d'aller-retour DB à chaque ouverture du panier.
export const revalidate = 300;

export async function GET() {
  try {
    const bornes = await getFourchetteBornes();
    return NextResponse.json(bornes, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
    });
  } catch {
    return NextResponse.json(FOURCHETTE_DEFAULT, {
      headers: { 'Cache-Control': 'public, s-maxage=60' },
    });
  }
}

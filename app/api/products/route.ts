import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  // noStore() : opt-out explicite de toute couche de cache Next.js fetch
  // (Data Cache). Source utilisée par CartContext pour resynchroniser les
  // prix au démarrage et à l'arrivée sur /order — toute mise en cache (même
  // 30 s) rejouerait le bug "prix périmé après modif admin".
  noStore();
  try {
    const { data, error } = await supabaseAdmin
      .from('produits')
      .select('*')
      .order('categorie')
      .order('nom');

    if (error) throw error;

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        // Doublons explicites pour la CDN Vercel (au cas où) et les caches
        // intermédiaires en HTTP/1.0.
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
        Pragma: 'no-cache',
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

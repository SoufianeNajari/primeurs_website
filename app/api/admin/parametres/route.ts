import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/lib/admin-auth';
import { setParam } from '@/lib/parametres';
import {
  getFraisLivraisonCents,
  getMinCommandeCents,
  getSeuilLivraisonGratuiteCents,
} from '@/lib/livraison';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    const [fraisCents, minCents, seuilGratuitCents] = await Promise.all([
      getFraisLivraisonCents(),
      getMinCommandeCents(),
      getSeuilLivraisonGratuiteCents(),
    ]);
    return NextResponse.json({ fraisCents, minCents, seuilGratuitCents });
  } catch (err) {
    console.error('[admin/parametres GET]', err);
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
  }
}

type Body = {
  fraisCents?: unknown;
  minCents?: unknown;
  seuilGratuitCents?: unknown;
};

function parseCents(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  const n = Math.round(raw);
  if (n < 0 || n > 100_000) return null; // garde-fou : max 1000€
  return n;
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Body;
    const fraisCents = parseCents(body.fraisCents);
    const minCents = parseCents(body.minCents);
    const seuilGratuitCents = parseCents(body.seuilGratuitCents);

    if (fraisCents === null || minCents === null || seuilGratuitCents === null) {
      return NextResponse.json(
        { error: 'Valeurs invalides (entier en centimes, 0 à 100000)' },
        { status: 400 },
      );
    }
    if (seuilGratuitCents > 0 && seuilGratuitCents < minCents) {
      return NextResponse.json(
        { error: 'Le seuil de livraison offerte doit être ≥ au minimum de commande.' },
        { status: 400 },
      );
    }

    await Promise.all([
      setParam('frais_livraison_cents', fraisCents),
      setParam('min_commande_cents', minCents),
      setParam('seuil_livraison_gratuite_cents', seuilGratuitCents),
    ]);

    // Invalide le cache CDN du GET public.
    revalidatePath('/api/parametres/livraison');

    return NextResponse.json({ fraisCents, minCents, seuilGratuitCents });
  } catch (err) {
    console.error('[admin/parametres PATCH]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

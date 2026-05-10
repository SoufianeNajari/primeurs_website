import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { badRequestIfNotUuid } from '@/lib/uuid';

const STATUTS_AUTORISES = ['en_attente', 'confirmée', 'préparée', 'retirée', 'annulée'] as const;

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const badId = badRequestIfNotUuid(params.id);
    if (badId) return badId;

    const { id } = params;
    const body = await request.json();
    const update: Record<string, unknown> = {};

    if (typeof body.statut === 'string') {
      if (!STATUTS_AUTORISES.includes(body.statut as (typeof STATUTS_AUTORISES)[number])) {
        return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
      }
      update.statut = body.statut;
    }

    if ('prix_final' in body) {
      const v = body.prix_final;
      if (v === null || v === '') {
        update.prix_final = null;
      } else {
        const n = Number(v);
        if (Number.isNaN(n) || n < 0 || n > 99999.99) {
          return NextResponse.json({ error: 'Prix final invalide' }, { status: 400 });
        }
        update.prix_final = Math.round(n * 100) / 100;
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('commandes')
      .update(update)
      .eq('id', id)
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur API order update:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

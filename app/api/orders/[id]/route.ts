import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const update: Record<string, unknown> = {};

    if (typeof body.statut === 'string') {
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

    const { error } = await supabaseAdmin
      .from('commandes')
      .update(update)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur API order update:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

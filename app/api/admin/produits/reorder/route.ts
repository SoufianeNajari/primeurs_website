import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? body.ids : null;
    if (!ids || ids.length === 0 || !ids.every((x: unknown) => typeof x === 'string')) {
      return NextResponse.json({ error: 'ids requis (string[])' }, { status: 400 });
    }

    // Pas de transaction côté Supabase JS ; on émet les updates en parallèle.
    // Conflit improbable : un seul admin connecté à la fois en pratique.
    const results = await Promise.all(
      ids.map((id: string, index: number) =>
        supabaseAdmin.from('produits').update({ ordre: index + 1 }).eq('id', id),
      ),
    );

    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error('[admin/produits/reorder]', failed.error);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/produits/reorder]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

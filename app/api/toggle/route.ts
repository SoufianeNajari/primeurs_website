import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';

export async function PATCH(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { id, disponible } = body;

    if (!id || typeof disponible !== 'boolean') {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('produits')
      .update({ disponible })
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur API toggle:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

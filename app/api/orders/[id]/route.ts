import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = params;
    const { statut } = await request.json();

    const { error } = await supabaseAdmin
      .from('commandes')
      .update({ statut })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur API order update:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies();
    const authCookie = cookieStore.get('admin_auth');

    if (!authCookie || authCookie.value !== 'true') {
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

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id, actif } = (await request.json().catch(() => ({}))) as { id?: string; actif?: boolean };
  if (!id || typeof actif !== 'boolean') {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('clients_autorises')
    .update({ actif })
    .eq('id', id);

  if (error) {
    console.error('[admin/clients/toggle]', error);
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

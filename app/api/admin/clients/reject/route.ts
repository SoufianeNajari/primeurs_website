import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { requestId } = (await request.json().catch(() => ({}))) as { requestId?: string };
  if (!requestId) return NextResponse.json({ error: 'requestId manquant' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('access_requests')
    .update({ statut: 'refusee' })
    .eq('id', requestId);

  if (error) {
    console.error('[admin/clients/reject]', error);
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

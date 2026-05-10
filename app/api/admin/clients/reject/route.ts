import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { badRequestIfNotUuid } from '@/lib/uuid';

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { requestId } = (await request.json().catch(() => ({}))) as { requestId?: string };
  const badId = badRequestIfNotUuid(requestId, 'requestId invalide');
  if (badId) return badId;

  const { data, error } = await supabaseAdmin
    .from('access_requests')
    .update({ statut: 'refusee' })
    .eq('id', requestId!)
    .select('id');

  if (error) {
    console.error('[admin/clients/reject]', error);
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

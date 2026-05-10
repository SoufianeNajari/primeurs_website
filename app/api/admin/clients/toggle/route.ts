import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { badRequestIfNotUuid } from '@/lib/uuid';

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id, actif } = (await request.json().catch(() => ({}))) as { id?: string; actif?: boolean };
  const badId = badRequestIfNotUuid(id);
  if (badId) return badId;
  if (typeof actif !== 'boolean') {
    return NextResponse.json({ error: 'Paramètre actif invalide' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('clients_autorises')
    .update({ actif })
    .eq('id', id!)
    .select('id');

  if (error) {
    console.error('[admin/clients/toggle]', error);
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

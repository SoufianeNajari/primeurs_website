import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { badRequestIfNotUuid } from '@/lib/uuid';

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  const badId = badRequestIfNotUuid(id);
  if (badId) return badId;

  // FK on commandes.client_id est ON DELETE SET NULL → l'historique de commandes
  // est préservé, le lien est simplement détaché.
  const { data, error } = await supabaseAdmin
    .from('clients_autorises')
    .delete()
    .eq('id', id!)
    .select('id');

  if (error) {
    console.error('[admin/clients/delete]', error);
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

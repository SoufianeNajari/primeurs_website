import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 });

  // FK on commandes.client_id est ON DELETE SET NULL → l'historique de commandes
  // est préservé, le lien est simplement détaché.
  const { error } = await supabaseAdmin.from('clients_autorises').delete().eq('id', id);

  if (error) {
    console.error('[admin/clients/delete]', error);
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { badRequestIfNotUuid } from '@/lib/uuid';

export const dynamic = 'force-dynamic';

// DELETE = désactiver l'arrivage (la home masque la section si aucun actif).
// On ne supprime pas la ligne pour garder un historique en BDD.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const badId = badRequestIfNotUuid(params.id);
  if (badId) return badId;

  const { data, error } = await supabaseAdmin
    .from('arrivages_rungis')
    .update({ actif: false })
    .eq('id', params.id)
    .select('id');
  if (error) {
    console.error('[arrivages] désactivation error:', error);
    return NextResponse.json({ error: 'Erreur lors de la désactivation.' }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Arrivage introuvable' }, { status: 404 });
  }
  revalidatePath('/');
  return NextResponse.json({ ok: true });
}

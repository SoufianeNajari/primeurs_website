import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

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
  const { error } = await supabaseAdmin
    .from('arrivages_rungis')
    .update({ actif: false })
    .eq('id', params.id);
  if (error) {
    console.error('[arrivages] désactivation error:', error);
    return NextResponse.json({ error: 'Erreur lors de la désactivation.' }, { status: 500 });
  }
  revalidatePath('/');
  return NextResponse.json({ ok: true });
}

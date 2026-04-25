import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { requestId } = (await request.json().catch(() => ({}))) as { requestId?: string };
  if (!requestId) return NextResponse.json({ error: 'requestId manquant' }, { status: 400 });

  const { data: req, error: reqErr } = await supabaseAdmin
    .from('access_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (reqErr || !req) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  }

  // Insert dans la whitelist (idempotent : si déjà whitelisté, on marque juste la demande approuvée)
  const { error: insErr } = await supabaseAdmin.from('clients_autorises').insert({
    telephone: req.telephone,
    prenom: req.prenom,
    nom: req.nom,
    email: req.email,
    actif: true,
  });

  if (insErr && insErr.code !== '23505') {
    console.error('[admin/clients/approve]', insErr);
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
  }

  await supabaseAdmin
    .from('access_requests')
    .update({ statut: 'approuvee' })
    .eq('id', requestId);

  return NextResponse.json({ success: true });
}

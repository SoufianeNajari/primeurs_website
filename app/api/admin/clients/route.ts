import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { normalizePhoneFR } from '@/lib/phone';

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  let body: { telephone?: string; prenom?: string; nom?: string; email?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const e164 = normalizePhoneFR(body.telephone || '');
  if (!e164) {
    return NextResponse.json({ error: 'Numéro de téléphone invalide.' }, { status: 400 });
  }

  const { error, data } = await supabaseAdmin
    .from('clients_autorises')
    .insert({
      telephone: e164,
      prenom: (body.prenom || '').trim() || null,
      nom: (body.nom || '').trim() || null,
      email: (body.email || '').trim() || null,
      notes: (body.notes || '').trim() || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ce numéro est déjà autorisé.' }, { status: 409 });
    }
    console.error('[admin/clients POST]', error);
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
  }

  return NextResponse.json({ client: data }, { status: 201 });
}

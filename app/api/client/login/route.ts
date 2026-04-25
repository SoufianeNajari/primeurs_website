import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getClientSession } from '@/lib/client-auth';
import { normalizePhoneFR } from '@/lib/phone';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ip = getClientIp();
  const rl = rateLimit('client-login', ip, 5, 60 * 60 * 1000); // 5 / heure / IP
  if (!rl.success) {
    const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans une heure.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  let body: { telephone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const e164 = normalizePhoneFR(body.telephone || '');
  if (!e164) {
    return NextResponse.json(
      { error: 'Numéro de téléphone invalide. Format attendu : 06 12 34 56 78.' },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from('clients_autorises')
    .select('id, actif')
    .eq('telephone', e164)
    .maybeSingle();

  if (error) {
    console.error('[client/login]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }

  if (!data || !data.actif) {
    return NextResponse.json(
      { error: "Ce numéro n'est pas encore autorisé.", canRequest: true },
      { status: 403 },
    );
  }

  const session = await getClientSession();
  session.clientId = data.id;
  session.telephone = e164;
  session.loggedInAt = Date.now();
  await session.save();

  return NextResponse.json({ success: true });
}

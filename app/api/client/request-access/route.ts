import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/mailer';
import { normalizePhoneFR, formatPhoneFRDisplay } from '@/lib/phone';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { SITE } from '@/lib/site';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export async function POST(request: Request) {
  const ip = getClientIp();
  const rl = rateLimit('client-request', ip, 3, 24 * 60 * 60 * 1000); // 3 / jour / IP
  if (!rl.success) {
    const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'Trop de demandes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  let body: { telephone?: string; prenom?: string; nom?: string; email?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const e164 = normalizePhoneFR(body.telephone || '');
  if (!e164) {
    return NextResponse.json({ error: 'Numéro de téléphone invalide.' }, { status: 400 });
  }

  const prenom = (body.prenom || '').trim().slice(0, 80) || null;
  const nom = (body.nom || '').trim().slice(0, 80) || null;
  const email = (body.email || '').trim().slice(0, 200) || null;
  const message = (body.message || '').trim().slice(0, 1000) || null;

  if (!prenom || !nom) {
    return NextResponse.json({ error: 'Prénom et nom requis.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('access_requests').insert({
    telephone: e164,
    prenom,
    nom,
    email,
    message,
  });

  if (error) {
    console.error('[client/request-access]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }

  const shopEmail = process.env.SHOP_EMAIL;
  if (shopEmail) {
    try {
      await sendEmail({
        to: shopEmail,
        subject: `Nouvelle demande d'accès — ${prenom} ${nom}`,
        html: `
          <h2>Demande d'accès au site</h2>
          <p><strong>${escapeHtml(prenom)} ${escapeHtml(nom)}</strong></p>
          <p>Téléphone : <strong>${escapeHtml(formatPhoneFRDisplay(e164))}</strong></p>
          ${email ? `<p>Email : ${escapeHtml(email)}</p>` : ''}
          ${message ? `<p>Message : <em>${escapeHtml(message)}</em></p>` : ''}
          <hr>
          <p>Pour autoriser ce client, va dans <a href="${SITE.url}/admin/clients">le panel admin</a>.</p>
        `,
      });
    } catch (e) {
      console.error('[client/request-access] email failed', e);
      // On ne fait pas échouer la requête si l'email échoue
    }
  }

  return NextResponse.json({ success: true });
}

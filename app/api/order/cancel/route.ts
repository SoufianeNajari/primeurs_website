import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/mailer';
import { verifyCancelToken } from '@/lib/cancel-token';
import { shortOrderId } from '@/lib/order';

export const dynamic = 'force-dynamic';

// POST /api/order/cancel
// Body: { id: string, exp: number, sig: string }
//
// Annule une commande à partir d'un lien signé reçu dans l'email J-1.
// Aucune authentification : la signature HMAC + expiration valent jeton.
// Idempotent : ré-annuler une commande déjà annulée renvoie ok.
export async function POST(request: Request) {
  let body: { id?: string; exp?: number; sig?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const id = typeof body?.id === 'string' ? body.id : '';
  const exp = Number(body?.exp);
  const sig = typeof body?.sig === 'string' ? body.sig : '';

  if (!id || !sig || !Number.isFinite(exp)) {
    return NextResponse.json({ error: 'Lien invalide.' }, { status: 400 });
  }
  if (!verifyCancelToken(id, exp, sig)) {
    return NextResponse.json({ error: 'Lien expiré ou invalide.' }, { status: 401 });
  }

  // Récupère la commande pour notif shop + idempotence
  const { data: order, error: fetchErr } = await supabaseAdmin
    .from('commandes')
    .select('id, statut, client_nom, client_email, date_livraison, creneau_livraison, ville, cancelled_at')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) {
    console.error('[cancel] fetch error:', fetchErr);
    return NextResponse.json({ error: 'Erreur lors de la récupération de la commande.' }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
  }

  // Déjà annulée : on renvoie ok sans rejouer la notif
  if (order.cancelled_at) {
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }
  // Déjà retirée : on refuse l'annulation
  if (order.statut === 'retirée') {
    return NextResponse.json({ error: 'Commande déjà livrée, annulation impossible.' }, { status: 409 });
  }

  const { error: updateErr } = await supabaseAdmin
    .from('commandes')
    .update({ statut: 'annulée', cancelled_at: new Date().toISOString() })
    .eq('id', id);

  if (updateErr) {
    console.error('[cancel] update error:', updateErr);
    return NextResponse.json({ error: 'Erreur lors de l\'annulation.' }, { status: 500 });
  }

  // Notif shop (best-effort, on ne fait pas échouer l'annulation si l'email plante)
  const shopEmail = process.env.SHOP_EMAIL;
  if (shopEmail) {
    try {
      const dateText = order.date_livraison ?? '?';
      const creneauText = order.creneau_livraison ?? '?';
      const villeText = order.ville ?? '?';
      const shortId = shortOrderId(id);
      await sendEmail({
        to: shopEmail,
        subject: `Annulation client — ${order.client_nom} — ${shortId} — ${dateText}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #fff; border: 1px solid #E5E5E5;">
            <h2 style="font-family: Georgia, serif; color: #9B3A3A; font-weight: normal;">Commande annulée par le client</h2>
            <p><strong>${order.client_nom}</strong> (${order.client_email}) a annulé sa livraison.</p>
            <ul style="line-height: 1.7;">
              <li>Commande : <strong>${shortId}</strong></li>
              <li>Date prévue : <strong>${dateText}</strong></li>
              <li>Créneau : <strong>${creneauText}</strong></li>
              <li>Ville : <strong>${villeText}</strong></li>
            </ul>
            <p style="color: #666; font-size: 13px;">L'annulation a été effectuée via le lien signé envoyé dans l'email J-1.</p>
          </div>
        `.trim(),
      });
    } catch (e) {
      console.error('[cancel] shop notif failed:', e);
    }
  }

  return NextResponse.json({ ok: true });
}

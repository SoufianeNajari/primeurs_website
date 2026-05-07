import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/mailer';
import { emailRappelJ1 } from '@/lib/emails/templates';
import { buildCancelUrl } from '@/lib/cancel-token';
import { SITE, LIVREUR } from '@/lib/site';

export const dynamic = 'force-dynamic';

// Cron quotidien — envoie un rappel J-1 à toutes les commandes prévues
// le lendemain qui n'ont pas déjà reçu le rappel et ne sont pas annulées.
//
// Idempotence : on flagge `rappel_j1_envoye_le` après envoi pour qu'un
// re-run du cron ne renvoie pas le même mail. Si `sendEmail` plante, on
// ne flagge pas → l'envoi sera retenté au prochain run.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 500 });
  }
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // Date de demain en YYYY-MM-DD (timezone Paris pour cohérence avec
  // les dates de livraison stockées en date).
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const { data: commandes, error } = await supabaseAdmin
    .from('commandes')
    .select('id, client_nom, client_email, date_livraison, creneau_livraison, adresse, complement_adresse, code_postal, ville, statut, cancelled_at, rappel_j1_envoye_le')
    .eq('date_livraison', tomorrowIso)
    .is('cancelled_at', null)
    .is('rappel_j1_envoye_le', null);

  if (error) {
    console.error('[cron/rappel-livraison] fetch error:', error);
    return NextResponse.json({ error: 'Erreur lecture commandes' }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const cmd of commandes ?? []) {
    if (!cmd.client_email || !cmd.date_livraison || !cmd.creneau_livraison || !cmd.adresse) continue;
    const prenom = cmd.client_nom?.split(/\s+/)[0] || 'à toi';
    const adresseParts = [cmd.adresse, cmd.complement_adresse, `${cmd.code_postal ?? ''} ${cmd.ville ?? ''}`.trim()]
      .filter(Boolean) as string[];
    const adresseFull = adresseParts.join(', ');
    const cancelUrl = buildCancelUrl(SITE.url, cmd.id, 7);

    try {
      const html = await emailRappelJ1({
        prenom,
        dateLivraison: cmd.date_livraison,
        creneauLabel: cmd.creneau_livraison,
        adresseFull,
        cancelUrl,
        livreurPrenom: LIVREUR.prenom,
      });
      await sendEmail({
        to: cmd.client_email,
        subject: 'Votre livraison Primeur Chez Vous demain',
        html,
      });
      const { error: flagErr } = await supabaseAdmin
        .from('commandes')
        .update({ rappel_j1_envoye_le: new Date().toISOString() })
        .eq('id', cmd.id);
      if (flagErr) console.error('[cron/rappel-livraison] flag error:', flagErr);
      sent++;
    } catch (e) {
      console.error('[cron/rappel-livraison] send error:', e);
      failed++;
    }
  }

  console.log('[cron/rappel-livraison] OK', { tomorrowIso, sent, failed });
  return NextResponse.json({ success: true, tomorrowIso, sent, failed });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/mailer';
import { emailRappelJ1, emailRelanceJ14 } from '@/lib/emails/templates';
import { buildCancelUrl } from '@/lib/cancel-token';
import { getCutoffVeilleHeure } from '@/lib/livraison';
import { SITE } from '@/lib/site';
import { splitClientNom } from '@/lib/order';

export const dynamic = 'force-dynamic';

// Cron quotidien (run par Vercel à 0 6 * * * UTC = 7h Paris été / 8h hiver).
// Hobby plan = 2 crons max → ce route gère 2 jobs en séquence :
//   1. Rappel J-1 : email aux commandes prévues le lendemain
//   2. Relance J+14 : email aux clients dont la dernière commande date d'il y a 14 jours
// Les deux sont idempotents via un flag dédié sur `commandes`.

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 500 });
  }
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const rappelStats = await runRappelJ1();
  const relanceStats = await runRelanceJ14();

  console.log('[cron/rappel-livraison] OK', { rappel: rappelStats, relance: relanceStats });
  return NextResponse.json({ success: true, rappel: rappelStats, relance: relanceStats });
}

// ───── Rappel J-1 ─────────────────────────────────────────────────────────

async function runRappelJ1(): Promise<{ tomorrowIso: string; sent: number; failed: number }> {
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
    console.error('[cron/rappel-j1] fetch error:', error);
    return { tomorrowIso, sent: 0, failed: 0 };
  }

  const cutoffHeure = await getCutoffVeilleHeure();
  let sent = 0;
  let failed = 0;

  for (const cmd of commandes ?? []) {
    if (!cmd.client_email || !cmd.date_livraison || !cmd.creneau_livraison || !cmd.adresse) continue;
    const prenom = splitClientNom(cmd.client_nom).prenom || 'à toi';
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
        cutoffHeure,
      });
      await sendEmail({
        to: cmd.client_email,
        subject: 'Votre livraison Primeurs Chez Vous demain',
        html,
      });
      const { error: flagErr } = await supabaseAdmin
        .from('commandes')
        .update({ rappel_j1_envoye_le: new Date().toISOString() })
        .eq('id', cmd.id);
      if (flagErr) console.error('[cron/rappel-j1] flag error:', flagErr);
      sent++;
    } catch (e) {
      console.error('[cron/rappel-j1] send error:', e);
      failed++;
    }
  }
  return { tomorrowIso, sent, failed };
}

// ───── Relance J+14 ───────────────────────────────────────────────────────
// On cherche les commandes créées il y a 14 à 15 jours. Pour chaque email
// on garde la plus récente dans cette fenêtre, on vérifie qu'il n'a pas
// commandé après (auquel cas il est déjà revenu — pas besoin de relancer)
// puis on envoie. On flagge toutes les candidates du même email pour
// éviter de re-considérer demain.

async function runRelanceJ14(): Promise<{ sent: number; skipped: number; failed: number }> {
  const now = Date.now();
  const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;
  const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
  const fromIso = new Date(now - FIFTEEN_DAYS).toISOString();
  const toIso = new Date(now - FOURTEEN_DAYS).toISOString();

  const { data: candidates, error } = await supabaseAdmin
    .from('commandes')
    .select('id, client_nom, client_email, created_at')
    .gte('created_at', fromIso)
    .lt('created_at', toIso)
    .is('cancelled_at', null)
    .is('relance_j14_envoye_le', null)
    .not('client_email', 'is', null);

  if (error) {
    console.error('[cron/relance-j14] fetch error:', error);
    return { sent: 0, skipped: 0, failed: 0 };
  }

  // Dédup par email : on garde la commande la plus récente de la fenêtre.
  type Candidate = { id: string; client_nom: string; client_email: string; created_at: string };
  const byEmail = new Map<string, Candidate>();
  for (const c of (candidates ?? []) as Candidate[]) {
    if (!c.client_email) continue;
    const key = c.client_email.toLowerCase().trim();
    const prev = byEmail.get(key);
    if (!prev || c.created_at > prev.created_at) byEmail.set(key, c);
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const cand of Array.from(byEmail.values())) {
    // L'email a-t-il commandé plus récemment (== il est déjà revenu) ?
    const { data: laterRows, error: laterErr } = await supabaseAdmin
      .from('commandes')
      .select('id', { count: 'exact', head: false })
      .ilike('client_email', cand.client_email)
      .gt('created_at', cand.created_at)
      .is('cancelled_at', null)
      .limit(1);

    if (laterErr) {
      console.error('[cron/relance-j14] later check error:', laterErr);
      failed++;
      continue;
    }

    const alreadyReturned = (laterRows?.length ?? 0) > 0;
    if (alreadyReturned) {
      // On flagge la candidate pour ne pas la reconsidérer
      await supabaseAdmin
        .from('commandes')
        .update({ relance_j14_envoye_le: new Date().toISOString() })
        .ilike('client_email', cand.client_email)
        .lte('created_at', cand.created_at)
        .is('relance_j14_envoye_le', null);
      skipped++;
      continue;
    }

    const prenom = splitClientNom(cand.client_nom).prenom || 'à toi';
    try {
      const html = await emailRelanceJ14({
        prenom,
        boutiqueUrl: `${SITE.url}/boutique`,
      });
      await sendEmail({
        to: cand.client_email,
        subject: 'Le marché du moment — Primeurs Chez Vous',
        html,
      });
      // Flag toutes les commandes de cet email <= cand.created_at pour
      // verrouiller la relance (idempotence forte).
      const { error: flagErr } = await supabaseAdmin
        .from('commandes')
        .update({ relance_j14_envoye_le: new Date().toISOString() })
        .ilike('client_email', cand.client_email)
        .lte('created_at', cand.created_at)
        .is('relance_j14_envoye_le', null);
      if (flagErr) console.error('[cron/relance-j14] flag error:', flagErr);
      sent++;
    } catch (e) {
      console.error('[cron/relance-j14] send error:', e);
      failed++;
    }
  }
  return { sent, skipped, failed };
}

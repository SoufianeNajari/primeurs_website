import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { sendEmail } from '@/lib/mailer';
import { emailRappelJ1 } from '@/lib/emails/templates';
import { buildCancelUrl } from '@/lib/cancel-token';
import { LIVREUR } from '@/lib/site';

export const dynamic = 'force-dynamic';

// Déclenchement manuel de l'email J-1 depuis /admin/orders.
// Reproduit le cron mais pour une commande, force l'envoi (ignore le flag),
// et utilise l'origin de la requête pour que le lien d'annulation pointe sur
// le déploiement courant (preview Vercel ou prod).
function currentOrigin(): string {
  const h = headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { data: cmd, error } = await supabaseAdmin
    .from('commandes')
    .select('id, client_nom, client_email, date_livraison, creneau_livraison, adresse, complement_adresse, code_postal, ville, statut, cancelled_at, rappel_j1_envoye_le')
    .eq('id', params.id)
    .single();

  if (error || !cmd) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
  }
  if (cmd.cancelled_at) {
    return NextResponse.json({ error: 'Commande annulée' }, { status: 400 });
  }
  if (!cmd.client_email) {
    return NextResponse.json({ error: 'Pas d\'email client renseigné' }, { status: 400 });
  }
  if (!cmd.date_livraison || !cmd.creneau_livraison || !cmd.adresse) {
    return NextResponse.json({ error: 'Données livraison incomplètes' }, { status: 400 });
  }

  const prenom = cmd.client_nom?.split(/\s+/)[0] || 'à toi';
  const adresseParts = [cmd.adresse, cmd.complement_adresse, `${cmd.code_postal ?? ''} ${cmd.ville ?? ''}`.trim()]
    .filter(Boolean) as string[];
  const adresseFull = adresseParts.join(', ');
  const cancelUrl = buildCancelUrl(currentOrigin(), cmd.id, 7);

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
    await supabaseAdmin
      .from('commandes')
      .update({ rappel_j1_envoye_le: new Date().toISOString() })
      .eq('id', cmd.id);
    return NextResponse.json({ success: true, alreadySent: cmd.rappel_j1_envoye_le != null });
  } catch (e) {
    console.error('[orders/send-j1] send error:', e);
    return NextResponse.json({ error: 'Échec envoi email' }, { status: 500 });
  }
}

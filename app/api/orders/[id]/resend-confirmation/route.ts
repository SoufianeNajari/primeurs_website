import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { sendEmail } from '@/lib/mailer';
import { emailClient, emailShop, type LigneCommande } from '@/lib/emails/templates';
import { getFourchetteBornes } from '@/lib/fourchette';
import { getCodeParrainPourClient, PARRAINAGE_CONFIG } from '@/lib/parrainage';
import { badRequestIfNotUuid } from '@/lib/uuid';

export const dynamic = 'force-dynamic';

// Réenvoi manuel de la confirmation depuis /admin/orders. Surface utile quand
// Resend était down/quota atteint/domaine non vérifié au moment de la commande
// (les emails partent désormais en non-bloquant — cf. T2.1 audit 2026-05-14).
//
// `target` = 'client' | 'shop' | 'both' (défaut 'client' car c'est le besoin
// principal : le client attend sa confirmation).

type ResendTarget = 'client' | 'shop' | 'both';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const badId = badRequestIfNotUuid(params.id);
  if (badId) return badId;

  let target: ResendTarget = 'client';
  try {
    const body = await request.json();
    if (body?.target === 'shop' || body?.target === 'both') target = body.target;
  } catch {
    // body optionnel
  }

  const { data: cmd, error } = await supabaseAdmin
    .from('commandes')
    .select('id, client_nom, client_email, client_telephone, lignes, message, adresse, complement_adresse, ville, code_postal, creneau_livraison, date_livraison, frais_livraison_cents, code_promo, reduction_cents')
    .eq('id', params.id)
    .single();

  if (error || !cmd) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
  }
  if (!cmd.client_email || !cmd.adresse || !cmd.date_livraison || !cmd.creneau_livraison) {
    return NextResponse.json({ error: 'Données commande incomplètes' }, { status: 400 });
  }

  const fourchetteBornes = await getFourchetteBornes();
  const livraisonInfos = {
    adresse: cmd.adresse,
    complementAdresse: cmd.complement_adresse,
    ville: cmd.ville ?? '',
    codePostal: cmd.code_postal ?? '',
    creneauLabel: cmd.creneau_livraison,
    dateLivraison: cmd.date_livraison,
    fraisLivraisonCents: cmd.frais_livraison_cents ?? 0,
    codePromo: cmd.code_promo ?? null,
    reductionCents: cmd.reduction_cents ?? 0,
  };
  const [prenom, ...nomParts] = (cmd.client_nom || '').split(/\s+/);
  const nom = nomParts.join(' ');
  const lignes = (cmd.lignes ?? []) as LigneCommande[];

  const tasks: Array<Promise<{ kind: 'client' | 'shop' }>> = [];

  if (target === 'client' || target === 'both') {
    const codeParrainage = await getCodeParrainPourClient(cmd.client_email).catch(() => null);
    tasks.push(
      emailClient({
        ...livraisonInfos,
        prenom: prenom || 'Bonjour',
        lignes,
        fourchetteBornes,
        codeParrainage,
        reductionParrainageCents: PARRAINAGE_CONFIG.reductionFilleulCents,
        panierMinParrainageCents: PARRAINAGE_CONFIG.panierMinCents,
      }).then((html) =>
        sendEmail({
          to: cmd.client_email!,
          subject: `Votre livraison est confirmée — Primeur Chez Vous`,
          html,
        }).then(() => ({ kind: 'client' as const })),
      ),
    );
  }

  if (target === 'shop' || target === 'both') {
    const shopEmailAddr = process.env.SHOP_EMAIL;
    if (!shopEmailAddr) {
      return NextResponse.json({ error: 'SHOP_EMAIL non configuré' }, { status: 500 });
    }
    tasks.push(
      emailShop({
        ...livraisonInfos,
        prenom: prenom || '',
        nom,
        email: cmd.client_email,
        telephone: cmd.client_telephone ?? '',
        message: cmd.message,
        lignes,
        orderId: cmd.id,
        fourchetteBornes,
      }).then((html) =>
        sendEmail({
          to: shopEmailAddr,
          subject: `Nouvelle livraison — ${cmd.client_nom} — ${cmd.creneau_livraison} — ${cmd.ville}`,
          html,
        }).then(() => ({ kind: 'shop' as const })),
      ),
    );
  }

  const results = await Promise.allSettled(tasks);
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {};
  const errors: string[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      if (r.value.kind === 'client') update.email_client_sent_at = now;
      if (r.value.kind === 'shop') update.email_shop_sent_at = now;
    } else {
      errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
    }
  }
  if (errors.length > 0) update.email_last_error = errors.join(' | ');
  else if (Object.keys(update).length > 0) update.email_last_error = null;

  if (Object.keys(update).length > 0) {
    await supabaseAdmin.from('commandes').update(update).eq('id', cmd.id);
  }

  if (errors.length > 0 && Object.keys(update).length === 0) {
    return NextResponse.json({ error: errors.join(' | ') }, { status: 502 });
  }
  return NextResponse.json({
    success: true,
    sent: {
      client: update.email_client_sent_at != null,
      shop: update.email_shop_sent_at != null,
    },
    errors: errors.length > 0 ? errors : undefined,
  });
}

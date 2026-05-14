import { sendEmail } from '@/lib/mailer';
import { emailClient, emailShop, type LigneCommande } from '@/lib/emails/templates';
import { type FourchetteBornes } from '@/lib/fourchette';
import { PARRAINAGE_CONFIG } from '@/lib/parrainage';
import { supabaseAdmin } from '@/lib/supabase';

export type LivraisonInfos = {
  adresse: string;
  complementAdresse: string | null;
  ville: string;
  codePostal: string;
  creneauLabel: string;
  dateLivraison: string;
  fraisLivraisonCents: number;
  codePromo: string | null;
  reductionCents: number;
};

export type OrderEmailContext = {
  orderId: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  message?: string | null;
  lignes: LigneCommande[];
  livraisonInfos: LivraisonInfos;
  fourchetteBornes: FourchetteBornes;
  codeParrainage: string | null;
};

export async function sendShopOrderEmail(ctx: OrderEmailContext, to: string): Promise<void> {
  const html = await emailShop({
    ...ctx.livraisonInfos,
    prenom: ctx.prenom,
    nom: ctx.nom,
    email: ctx.email,
    telephone: ctx.telephone,
    message: ctx.message,
    lignes: ctx.lignes,
    orderId: ctx.orderId,
    fourchetteBornes: ctx.fourchetteBornes,
  });
  const fullName = ctx.nom ? `${ctx.prenom} ${ctx.nom}` : ctx.prenom;
  await sendEmail({
    to,
    subject: `Nouvelle livraison — ${fullName} — ${ctx.livraisonInfos.creneauLabel} — ${ctx.livraisonInfos.ville}`,
    html,
  });
}

export async function sendClientOrderEmail(ctx: OrderEmailContext): Promise<void> {
  const html = await emailClient({
    ...ctx.livraisonInfos,
    prenom: ctx.prenom,
    lignes: ctx.lignes,
    fourchetteBornes: ctx.fourchetteBornes,
    codeParrainage: ctx.codeParrainage,
    reductionParrainageCents: PARRAINAGE_CONFIG.reductionFilleulCents,
    panierMinParrainageCents: PARRAINAGE_CONFIG.panierMinCents,
  });
  await sendEmail({
    to: ctx.email,
    subject: 'Votre livraison est confirmée — Primeur Chez Vous',
    html,
  });
}

function reasonToString(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

export type EmailDispatchOutcome = {
  shopOk: boolean;
  clientOk: boolean;
  errors: string[];
  update: Record<string, unknown>;
};

export function deriveEmailDispatch(results: {
  shop?: PromiseSettledResult<unknown>;
  client?: PromiseSettledResult<unknown>;
}): EmailDispatchOutcome {
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {};
  const errors: string[] = [];
  let shopOk = false;
  let clientOk = false;

  if (results.shop) {
    if (results.shop.status === 'fulfilled') { update.email_shop_sent_at = now; shopOk = true; }
    else errors.push(`shop: ${reasonToString(results.shop.reason)}`);
  }
  if (results.client) {
    if (results.client.status === 'fulfilled') { update.email_client_sent_at = now; clientOk = true; }
    else errors.push(`client: ${reasonToString(results.client.reason)}`);
  }
  if (errors.length > 0) update.email_last_error = errors.join(' | ');
  else if (Object.keys(update).length > 0) update.email_last_error = null;

  return { shopOk, clientOk, errors, update };
}

export async function persistEmailDispatch(orderId: string, update: Record<string, unknown>): Promise<void> {
  if (Object.keys(update).length === 0) return;
  const { error } = await supabaseAdmin.from('commandes').update(update).eq('id', orderId);
  if (error) console.error('[send-order] persist email dispatch failed', { orderId, error });
}

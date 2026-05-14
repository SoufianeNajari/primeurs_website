import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { type LigneCommande } from '@/lib/emails/templates';
import { sendShopOrderEmail, sendClientOrderEmail, deriveEmailDispatch, persistEmailDispatch, type OrderEmailContext } from '@/lib/emails/send-order';
import { getFourchetteBornes } from '@/lib/fourchette';
import { getCodeParrainPourClient } from '@/lib/parrainage';
import { badRequestIfNotUuid } from '@/lib/uuid';
import { splitClientNom } from '@/lib/order';

export const dynamic = 'force-dynamic';

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

  const sendShop = target === 'shop' || target === 'both';
  const shopEmailAddr = sendShop ? process.env.SHOP_EMAIL : undefined;
  if (sendShop && !shopEmailAddr) {
    return NextResponse.json({ error: 'SHOP_EMAIL non configuré' }, { status: 500 });
  }

  const sendClient = target === 'client' || target === 'both';
  const [fourchetteBornes, codeParrainage] = await Promise.all([
    getFourchetteBornes(),
    sendClient ? getCodeParrainPourClient(cmd.client_email).catch(() => null) : Promise.resolve(null),
  ]);
  const { prenom, nom } = splitClientNom(cmd.client_nom);
  const ctx: OrderEmailContext = {
    orderId: cmd.id,
    prenom: prenom || 'Bonjour',
    nom,
    email: cmd.client_email,
    telephone: cmd.client_telephone ?? '',
    message: cmd.message,
    lignes: (cmd.lignes ?? []) as LigneCommande[],
    livraisonInfos: {
      adresse: cmd.adresse,
      complementAdresse: cmd.complement_adresse,
      ville: cmd.ville ?? '',
      codePostal: cmd.code_postal ?? '',
      creneauLabel: cmd.creneau_livraison,
      dateLivraison: cmd.date_livraison,
      fraisLivraisonCents: cmd.frais_livraison_cents ?? 0,
      codePromo: cmd.code_promo ?? null,
      reductionCents: cmd.reduction_cents ?? 0,
    },
    fourchetteBornes,
    codeParrainage,
  };

  const [shopRes, clientRes] = await Promise.all([
    sendShop ? Promise.allSettled([sendShopOrderEmail(ctx, shopEmailAddr!)]).then((r) => r[0]) : Promise.resolve(undefined),
    sendClient ? Promise.allSettled([sendClientOrderEmail(ctx)]).then((r) => r[0]) : Promise.resolve(undefined),
  ]);

  const { shopOk, clientOk, errors, update } = deriveEmailDispatch({ shop: shopRes, client: clientRes });
  await persistEmailDispatch(cmd.id, update);

  if (errors.length > 0 && !shopOk && !clientOk) {
    return NextResponse.json({ error: errors.join(' | ') }, { status: 502 });
  }
  return NextResponse.json({
    success: true,
    sent: { client: clientOk, shop: shopOk },
    errors: errors.length > 0 ? errors : undefined,
  });
}

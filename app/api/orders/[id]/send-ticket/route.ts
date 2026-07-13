import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { badRequestIfNotUuid } from '@/lib/uuid';
import { sendEmail } from '@/lib/mailer';
import { renderTicketPdf, type TicketPdfOrder } from '@/lib/ticketPdf';
import { shortOrderId, splitClientNom } from '@/lib/order';
import { SITE } from '@/lib/site';

// @react-pdf/renderer nécessite le runtime Node (pas Edge).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const badId = badRequestIfNotUuid(params.id);
  if (badId) return badId;

  const { data: order, error } = await supabaseAdmin
    .from('commandes')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
  }
  if (!order.client_email) {
    return NextResponse.json({ error: "Ce client n'a pas d'adresse email" }, { status: 400 });
  }
  const hasTicket = Array.isArray(order.ticket_lignes) && order.ticket_lignes.length > 0;
  if (!hasTicket || order.prix_final == null) {
    return NextResponse.json(
      { error: 'Saisis d\'abord les quantités et prix réels (ticket) avant de l\'envoyer' },
      { status: 400 },
    );
  }

  let pdf: Buffer;
  try {
    pdf = await renderTicketPdf(order as TicketPdfOrder);
  } catch (e) {
    console.error('[send-ticket] renderTicketPdf:', e);
    return NextResponse.json({ error: 'Génération du ticket impossible' }, { status: 500 });
  }

  const { prenom } = splitClientNom(order.client_nom);
  // Montant réellement payé = sous-total produits (prix_final) + frais de
  // livraison − réduction code promo. Même formule que le PDF (lib/ticketPdf).
  const fraisEuros = (order.frais_livraison_cents ?? 0) / 100;
  const reductionEuros = (order.reduction_cents ?? 0) / 100;
  const totalPaye = Math.round((Number(order.prix_final) + fraisEuros - reductionEuros) * 100) / 100;
  const totalTxt = `${totalPaye.toFixed(2).replace('.', ',')} €`;
  const shortId = shortOrderId(order.id);

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="font-family:Georgia,serif;font-size:24px;color:#333;font-weight:normal;margin:0 0 16px">Bonjour ${prenom || ''},</h1>
  <p style="font-size:15px;line-height:1.6">Merci pour votre commande. Vous trouverez votre <strong>ticket de caisse</strong> (${shortId}) en pièce jointe de cet email.</p>
  <p style="font-size:15px;line-height:1.6">Montant réglé à la livraison : <strong>${totalTxt}</strong>.</p>
  <p style="font-size:13px;color:#666;margin-top:24px;border-top:1px solid #E5E5E5;padding-top:16px">
    <strong style="font-family:Georgia,serif;font-size:16px;color:#333">${SITE.name}</strong><br/>
    ${SITE.telephoneDisplay}
  </p>
</div>`;

  try {
    await sendEmail({
      to: order.client_email,
      subject: `Votre ticket de caisse ${shortId} — ${SITE.name}`,
      html,
      attachments: [{ filename: `ticket-${shortId.replace('#', '')}.pdf`, content: pdf }],
    });
  } catch (e) {
    console.error('[send-ticket] sendEmail:', e);
    return NextResponse.json({ error: "Échec de l'envoi de l'email" }, { status: 502 });
  }

  const nowIso = new Date().toISOString();
  await supabaseAdmin.from('commandes').update({ ticket_sent_at: nowIso }).eq('id', order.id);

  return NextResponse.json({ success: true, ticket_sent_at: nowIso });
}

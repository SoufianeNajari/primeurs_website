import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { isValidUuid } from '@/lib/uuid';
import { renderTicketPdf, type TicketPdfOrder } from '@/lib/ticketPdf';
import { shortOrderId } from '@/lib/order';

// @react-pdf/renderer nécessite le runtime Node (pas Edge).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return new NextResponse('Non autorisé', { status: 401 });
  }
  if (!isValidUuid(params.id)) {
    return new NextResponse('Identifiant invalide', { status: 400 });
  }

  const { data: order } = await supabaseAdmin
    .from('commandes')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!order) return new NextResponse('Commande introuvable', { status: 404 });

  const pdf = await renderTicketPdf(order as TicketPdfOrder);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="ticket-${shortOrderId(order.id).replace('#', '')}.pdf"`,
      'cache-control': 'no-store',
    },
  });
}

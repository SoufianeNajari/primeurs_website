import type { Metadata } from 'next';
import CancelClient from './CancelClient';
import { verifyCancelToken } from '@/lib/cancel-token';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Annuler ma livraison',
  robots: { index: false, follow: false },
};

type SearchParams = { id?: string; exp?: string; sig?: string };

export default async function CancelPage({ searchParams }: { searchParams: SearchParams }) {
  const id = searchParams.id ?? '';
  const exp = Number(searchParams.exp ?? 'NaN');
  const sig = searchParams.sig ?? '';

  const tokenOk = verifyCancelToken(id, exp, sig);

  // Si le token est valide on charge la commande pour personnaliser l'écran.
  let order: {
    client_nom: string;
    date_livraison: string | null;
    creneau_livraison: string | null;
    cancelled_at: string | null;
    statut: string;
  } | null = null;

  if (tokenOk) {
    const { data } = await supabaseAdmin
      .from('commandes')
      .select('client_nom, date_livraison, creneau_livraison, cancelled_at, statut')
      .eq('id', id)
      .maybeSingle();
    order = data ?? null;
  }

  return (
    <CancelClient
      tokenOk={tokenOk}
      orderId={id}
      exp={exp}
      sig={sig}
      order={order}
    />
  );
}

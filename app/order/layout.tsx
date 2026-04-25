import type { Metadata } from 'next';
import { isCommandesBloquees } from '@/lib/parametres';
import BoutiqueFermee from '@/components/BoutiqueFermee';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Passer commande',
  description:
    'Finalisez votre commande de fruits, légumes et fromages. Choisissez votre créneau de retrait en boutique à Pontault-Combault.',
  alternates: { canonical: '/order' },
  robots: { index: false, follow: true },
};

export default async function OrderLayout({ children }: { children: React.ReactNode }) {
  if (await isCommandesBloquees()) {
    return <BoutiqueFermee />;
  }
  return children;
}

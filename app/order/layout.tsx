import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Passer commande',
  description:
    'Finalisez votre commande de fruits, légumes et fromages. Choisissez votre créneau de retrait en boutique à Pontault-Combault.',
  alternates: { canonical: '/order' },
  robots: { index: false, follow: true },
};

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import ProductGrid from '@/components/ProductGrid';
import StickyCartButton from '@/components/StickyCartButton';

export const revalidate = 0; // Force SSR

export const metadata: Metadata = {
  title: 'Boutique — Fruits, légumes et fromages de saison',
  description:
    'Découvrez notre sélection de fruits, légumes et fromages frais. Produits locaux, de saison et bio. Commande en ligne, retrait à Pontault-Combault.',
  alternates: { canonical: '/boutique' },
  openGraph: {
    title: 'Boutique — Pontault Primeurs',
    description: 'Fruits, légumes et fromages frais. Produits de saison et locaux.',
    url: '/boutique',
  },
};

export default async function BoutiquePage() {
  const { data: products } = await supabaseAdmin
    .from('produits')
    .select('*')
    .order('disponible', { ascending: false })
    .order('ordre', { ascending: true })
    .order('nom', { ascending: true });

  return (
    <main className="flex-grow pb-28 min-h-screen bg-neutral-50">
      <div className="bg-neutral-50 border-b border-neutral-200 py-10 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-serif text-neutral-800 mb-4">Notre Boutique</h1>
          <p className="text-neutral-500 font-medium text-lg uppercase tracking-widest text-[11px]">Découvrez notre sélection fraîche du jour</p>
        </div>
      </div>

      <ProductGrid products={products || []} />
      
      <StickyCartButton />
    </main>
  );
}

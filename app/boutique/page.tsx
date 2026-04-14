import { supabaseAdmin } from '@/lib/supabase';
import ProductGrid from '@/components/ProductGrid';
import StickyCartButton from '@/components/StickyCartButton';

export const revalidate = 0; // Force SSR

export default async function BoutiquePage() {
  const { data: products } = await supabaseAdmin
    .from('produits')
    .select('*')
    .order('categorie')
    .order('nom');

  return (
    <main className="flex-grow pb-28 min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-6 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notre Boutique</h1>
          <p className="text-gray-500">Ajoutez vos articles au panier pour préparer votre retrait.</p>
        </div>
      </div>

      <ProductGrid products={products || []} />
      
      <StickyCartButton />
    </main>
  );
}

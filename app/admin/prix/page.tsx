import { supabaseAdmin } from '@/lib/supabase';
import type { Product } from '@/lib/produit';
import PrixDuJour from './PrixDuJour';

export const dynamic = 'force-dynamic';

type ProduitPrixRow = Product & { prix_updated_at: string };

export default async function AdminPrixPage() {
  const { data } = await supabaseAdmin
    .from('produits')
    .select('id, nom, categorie, slug, options, disponible, variete, prix_updated_at')
    .order('prix_updated_at', { ascending: true });

  const produits = (data || []) as ProduitPrixRow[];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-serif text-neutral-800">Prix du jour</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Mettez à jour les prix rapidement. Laissez vide = « prix à la remise ».
        </p>
      </div>
      <PrixDuJour initialProduits={produits} />
    </div>
  );
}

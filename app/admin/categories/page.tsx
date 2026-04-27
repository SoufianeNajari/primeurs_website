import { supabaseAdmin } from '@/lib/supabase';
import { listCategoriesAdmin, type Categorie } from '@/lib/categories';
import CategoriesManager from './CategoriesManager';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const categories = await listCategoriesAdmin();

  // Compteurs produits par categorie_id
  const { data: produits } = await supabaseAdmin
    .from('produits')
    .select('categorie_id');
  const counts: Record<string, number> = {};
  for (const p of produits || []) {
    if (p.categorie_id) counts[p.categorie_id] = (counts[p.categorie_id] || 0) + 1;
  }

  const withCounts = categories.map((c: Categorie) => ({ ...c, count: counts[c.id] || 0 }));

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-serif text-neutral-800 mb-2">Catégories</h2>
        <p className="text-sm text-neutral-500">
          Ajoutez, renommez ou réorganisez les catégories du catalogue. L&apos;ordre détermine la position dans la boutique et l&apos;admin.
        </p>
      </div>
      <CategoriesManager initialCategories={withCounts} />
    </div>
  );
}

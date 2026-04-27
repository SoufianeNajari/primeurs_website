import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import ProductForm from '@/components/ProductForm';
import { listCategoriesAdmin } from '@/lib/categories';
import type { Product } from '@/lib/produit';

export const dynamic = 'force-dynamic';

export default async function EditProduitPage({ params }: { params: { id: string } }) {
  const [{ data: produit }, cats] = await Promise.all([
    supabaseAdmin.from('produits').select('*').eq('id', params.id).maybeSingle(),
    listCategoriesAdmin(),
  ]);

  if (!produit) notFound();

  const categories = cats.filter(c => c.actif).map(c => c.nom);
  return <ProductForm mode={{ kind: 'edit', id: params.id }} initial={produit as Product} categories={categories} />;
}

import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import ProductForm from '@/components/ProductForm';
import type { Product } from '@/lib/produit';

export const dynamic = 'force-dynamic';

export default async function EditProduitPage({ params }: { params: { id: string } }) {
  const [{ data: produit }, { data: all }] = await Promise.all([
    supabaseAdmin.from('produits').select('*').eq('id', params.id).maybeSingle(),
    supabaseAdmin.from('produits').select('categorie'),
  ]);

  if (!produit) notFound();

  const categories = Array.from(new Set((all || []).map((r) => r.categorie))).sort();
  return <ProductForm mode={{ kind: 'edit', id: params.id }} initial={produit as Product} categories={categories} />;
}

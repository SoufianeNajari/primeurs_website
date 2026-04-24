import { supabaseAdmin } from '@/lib/supabase';
import ProductForm from '@/components/ProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProduitPage() {
  const { data } = await supabaseAdmin.from('produits').select('categorie');
  const categories = Array.from(new Set((data || []).map((r) => r.categorie))).sort();
  return <ProductForm mode={{ kind: 'create' }} categories={categories} />;
}

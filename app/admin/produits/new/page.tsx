import ProductForm from '@/components/ProductForm';
import { listCategoriesAdmin } from '@/lib/categories';

export const dynamic = 'force-dynamic';

export default async function NewProduitPage() {
  const cats = await listCategoriesAdmin();
  const categories = cats.filter(c => c.actif).map(c => c.nom);
  return <ProductForm mode={{ kind: 'create' }} categories={categories} />;
}

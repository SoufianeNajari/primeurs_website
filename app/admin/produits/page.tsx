import Link from 'next/link';
import { Plus, Upload } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';
import type { Product } from '@/lib/produit';
import AdminProduitsList from '@/components/admin/AdminProduitsList';

export const dynamic = 'force-dynamic';

export default async function AdminProduitsPage() {
  const { data } = await supabaseAdmin
    .from('produits')
    .select('*')
    .order('categorie', { ascending: true })
    .order('ordre', { ascending: true })
    .order('nom', { ascending: true });

  const produits = (data || []) as Product[];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif text-neutral-800">Produits</h1>
          <p className="text-sm text-neutral-500">Gérez votre catalogue — {produits.length} produit{produits.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/produits/import" className="inline-flex items-center gap-2 border border-neutral-300 text-neutral-700 px-4 py-2 font-medium uppercase tracking-widest text-[11px] hover:border-green-primary transition-colors">
            <Upload size={14} /> Importer CSV
          </Link>
          <Link href="/admin/produits/new" className="inline-flex items-center gap-2 bg-green-primary text-white px-4 py-2 font-medium uppercase tracking-widest text-[11px] hover:bg-green-dark">
            <Plus size={14} /> Nouveau produit
          </Link>
        </div>
      </div>

      <AdminProduitsList produits={produits} />
    </div>
  );
}

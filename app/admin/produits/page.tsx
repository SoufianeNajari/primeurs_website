import Link from 'next/link';
import Image from 'next/image';
import { Plus, Pencil } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';
import type { Product } from '@/lib/produit';
import { formatPrix } from '@/lib/produit';

export const dynamic = 'force-dynamic';

export default async function AdminProduitsPage() {
  const { data } = await supabaseAdmin
    .from('produits')
    .select('*')
    .order('categorie', { ascending: true })
    .order('ordre', { ascending: true })
    .order('nom', { ascending: true });

  const produits = (data || []) as Product[];
  const grouped = produits.reduce<Record<string, Product[]>>((acc, p) => {
    (acc[p.categorie] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif text-neutral-800">Produits</h1>
          <p className="text-sm text-neutral-500">Gérez votre catalogue — {produits.length} produit{produits.length > 1 ? 's' : ''}</p>
        </div>
        <Link href="/admin/produits/new" className="inline-flex items-center gap-2 bg-green-primary text-white px-4 py-2 font-medium uppercase tracking-widest text-[11px] hover:bg-green-dark">
          <Plus size={14} /> Nouveau produit
        </Link>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="border border-neutral-200 bg-white p-8 text-center text-neutral-500">
          Aucun produit pour l&apos;instant.
        </div>
      ) : (
        Object.entries(grouped).map(([categorie, items]) => (
          <section key={categorie} className="mb-8">
            <h2 className="text-xs uppercase tracking-widest text-neutral-500 font-medium mb-2">{categorie}</h2>
            <div className="bg-white border border-neutral-200 divide-y divide-neutral-200">
              {items.map((p) => (
                <Link key={p.id} href={`/admin/produits/${p.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-neutral-50 transition-colors">
                  <div className="relative w-14 h-14 bg-neutral-100 shrink-0 overflow-hidden">
                    {p.image_url ? (
                      <Image src={p.image_url} alt={p.nom} fill sizes="56px" className="object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-neutral-800 truncate">{p.nom}</div>
                    <div className="text-xs text-neutral-500 truncate">
                      {formatPrix(p.prix_kg, p.unite) || 'Prix non renseigné'}
                      {p.origine ? ` · ${p.origine}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {!p.disponible && <span className="border border-red-300 bg-red-50 text-red-700 px-2 py-0.5">Indispo</span>}
                    {p.bio && <span className="border border-green-300 bg-green-50 text-green-800 px-2 py-0.5">Bio</span>}
                    <Pencil size={14} className="text-neutral-400" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

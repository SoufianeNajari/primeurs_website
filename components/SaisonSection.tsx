import Link from 'next/link';
import Image from 'next/image';
import { supabaseAdmin } from '@/lib/supabase';
import { formatPrix, isEnSaison, type Product } from '@/lib/produit';
import { ArrowRight, Sparkles } from 'lucide-react';

export default async function SaisonSection() {
  const { data } = await supabaseAdmin
    .from('produits')
    .select('id, nom, slug, categorie, prix_kg, unite, image_url, mois_debut, mois_fin, disponible')
    .eq('disponible', true)
    .not('mois_debut', 'is', null)
    .not('mois_fin', 'is', null)
    .not('slug', 'is', null);

  const month = new Date().getMonth() + 1;
  const produits = ((data || []) as Product[])
    .filter((p) => isEnSaison(p.mois_debut, p.mois_fin, month))
    .slice(0, 6);

  if (produits.length === 0) return null;

  return (
    <section className="py-16 md:py-20 bg-neutral-50 border-t border-neutral-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-green-primary text-xs uppercase tracking-[0.2em] font-medium mb-2">
              <Sparkles size={14} strokeWidth={1.5} />
              De saison
            </div>
            <h2 className="text-3xl md:text-4xl font-serif text-neutral-800">En ce moment sur les étals</h2>
          </div>
          <Link
            href="/boutique"
            className="hidden sm:inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-green-primary transition-colors"
          >
            Voir toute la boutique <ArrowRight size={14} />
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory md:grid md:grid-cols-3 lg:grid-cols-6 md:gap-6 md:overflow-visible md:px-0 md:mx-0">
          {produits.map((p) => (
            <Link
              key={p.id}
              href={`/boutique/${p.slug}`}
              className="group shrink-0 w-[45%] min-w-[140px] snap-start md:w-auto bg-white border border-neutral-200 hover:border-green-primary transition-colors"
            >
              <div className="relative aspect-square bg-neutral-100 overflow-hidden">
                {p.image_url && (
                  <Image src={p.image_url} alt={p.nom} fill sizes="(max-width: 768px) 45vw, 200px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                )}
              </div>
              <div className="p-3">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">{p.categorie}</div>
                <div className="font-serif text-neutral-800 leading-snug">{p.nom}</div>
                {formatPrix(p.prix_kg, p.unite) && (
                  <div className="text-xs text-green-dark mt-1 font-medium">{formatPrix(p.prix_kg, p.unite)}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
        <Link href="/boutique" className="sm:hidden mt-4 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-green-primary">
          Voir toute la boutique <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}

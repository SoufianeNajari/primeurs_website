import Image from 'next/image';
import Link from 'next/link';
import { Sunrise, ArrowRight } from 'lucide-react';
import { getCurrentArrivage } from '@/lib/arrivages';

// Bloc home "Ce matin à Rungis" — alimenté par /admin/arrivages.
// Renvoie null si aucun arrivage actif : la home masque la section.
export default async function ArrivageRungis() {
  const arrivage = await getCurrentArrivage();
  if (!arrivage) return null;

  const produits = [arrivage.produit_1, arrivage.produit_2, arrivage.produit_3].filter((p): p is string => !!p);

  return (
    <section className="py-16 md:py-20 bg-white border-t border-neutral-200">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div className="relative w-full aspect-[4/3] overflow-hidden bg-neutral-100">
            <Image
              src={arrivage.photo_url}
              alt="Sélection du matin à Rungis"
              fill
              sizes="(max-width: 768px) 100vw, 500px"
              className="object-cover"
              priority={false}
            />
          </div>

          <div>
            <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-green-primary font-medium mb-4">
              <Sunrise size={14} strokeWidth={1.5} /> Ce matin à Rungis
            </span>
            <h2 className="text-3xl md:text-4xl font-serif text-neutral-800 mb-5">
              Notre sélection du jour
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-5 text-[15px]">
              Trois produits phares ramenés ce matin de Rungis et disponibles dans nos prochaines livraisons.
            </p>
            {produits.length > 0 && (
              <ul className="space-y-2 mb-7">
                {produits.map((p, i) => (
                  <li key={i} className="flex items-start gap-3 text-neutral-800">
                    <span className="w-1.5 h-1.5 bg-green-primary rounded-full mt-2 shrink-0" />
                    <span className="text-[15px]">{p}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/boutique"
              className="inline-flex items-center justify-center gap-2 bg-green-primary text-white px-6 py-3 text-sm uppercase tracking-widest font-medium hover:bg-green-dark transition-colors"
            >
              Voir la boutique <ArrowRight size={16} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

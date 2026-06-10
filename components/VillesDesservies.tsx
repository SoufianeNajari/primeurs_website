import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { VILLES_AUTORISEES } from '@/lib/livraison';

export default function VillesDesservies() {
  return (
    <section className="bg-white border-b border-neutral-200 py-12 md:py-16">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col items-center text-center mb-8">
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-green-primary font-medium mb-3">
            <MapPin size={14} strokeWidth={1.5} /> Zone de livraison
          </span>
          <h2 className="text-2xl md:text-3xl font-serif text-neutral-800 mb-2">
            Nous livrons 7 communes
          </h2>
          <p className="text-sm text-neutral-500 max-w-md">
            Mardi ou vendredi après-midi, créneaux de 2 h entre 15h et 21h.
          </p>
        </div>

        <ul className="flex flex-wrap justify-center gap-2 md:gap-3 mb-6">
          {VILLES_AUTORISEES.map((v) => (
            <li
              key={v.nom}
              className="inline-flex items-baseline gap-2 border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
            >
              <span className="font-serif text-neutral-800">{v.nom}</span>
              <span className="text-[10px] font-mono text-neutral-400">{v.codePostal}</span>
            </li>
          ))}
        </ul>

        <div className="text-center">
          <Link
            href="/zones-livrees"
            className="text-xs uppercase tracking-widest font-medium text-green-primary hover:text-green-dark"
          >
            Voir le détail des zones &amp; créneaux →
          </Link>
        </div>
      </div>
    </section>
  );
}

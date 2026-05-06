import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Truck, Clock } from 'lucide-react';
import { VILLES_AUTORISEES, CRENEAUX_LIVRAISON } from '@/lib/livraison';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Zones desservies',
  description:
    'Liste des communes desservies par Primeur Chez Vous : livraison à domicile de fruits, légumes et fromages affinés autour de Pontault-Combault.',
  alternates: { canonical: '/zones-livrees' },
};

export default function ZonesLivreesPage() {
  return (
    <main className="flex-grow py-12 md:py-20 px-4 bg-neutral-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-green-primary font-medium mb-4">
            <Truck size={14} strokeWidth={1.5} /> Livraison à domicile
          </span>
          <h1 className="text-4xl md:text-5xl font-serif text-neutral-800 mb-4">Zones desservies</h1>
          <p className="text-neutral-600 max-w-xl mx-auto leading-relaxed">
            Nous livrons 8 communes en Île-de-France, à l&apos;est de Paris.
          </p>
        </header>

        <section className="bg-white border border-neutral-200 p-6 md:p-10 mb-8">
          <h2 className="flex items-center gap-3 text-xl font-serif text-neutral-800 mb-6">
            <MapPin size={20} strokeWidth={1.5} className="text-green-primary" />
            Communes livrées
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VILLES_AUTORISEES.map((v) => (
              <li
                key={v.nom}
                className="flex items-baseline justify-between border border-neutral-200 px-4 py-3 bg-neutral-50"
              >
                <span className="font-serif text-base text-neutral-800">{v.nom}</span>
                <span className="text-xs font-mono text-neutral-500">{v.codePostal}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-neutral-500 italic mt-4">
            Votre commune n&apos;est pas dans la liste&nbsp;? Écrivez-nous à{' '}
            <a href={`mailto:${SITE.email}`} className="text-green-primary hover:underline">{SITE.email}</a>{' '}
            — nous étudions les demandes au cas par cas.
          </p>
        </section>

        <section className="bg-white border border-neutral-200 p-6 md:p-10 mb-8">
          <h2 className="flex items-center gap-3 text-xl font-serif text-neutral-800 mb-6">
            <Clock size={20} strokeWidth={1.5} className="text-green-primary" />
            Créneaux de livraison
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CRENEAUX_LIVRAISON.map((c) => (
              <li key={c.key} className="border border-neutral-200 px-4 py-4 bg-neutral-50">
                <div className="font-serif text-lg text-neutral-800">{c.label}</div>
                <div className="text-xs text-neutral-500 mt-1">Commande à passer la veille avant 18h</div>
              </li>
            ))}
          </ul>
          <p className="text-sm text-neutral-600 mt-6 leading-relaxed">
            Minimum de commande&nbsp;: <strong>20 €</strong>. Paiement à la livraison (CB ou espèces). Aucun acompte demandé.
          </p>
        </section>

        <div className="text-center pt-4">
          <Link
            href="/boutique"
            className="inline-block bg-green-primary text-white px-10 py-4 font-medium text-sm uppercase tracking-widest hover:bg-green-dark transition-colors border border-green-primary"
          >
            Commander ma livraison
          </Link>
        </div>
      </div>
    </main>
  );
}

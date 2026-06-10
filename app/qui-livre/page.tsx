import Link from 'next/link';
import type { Metadata } from 'next';
import { Sunrise, Truck, Wallet, MessageCircle, Clock, MapPin, ArrowLeft } from 'lucide-react';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: `Nos services | ${SITE.name}`,
  description:
    'Livraison à domicile de fruits et légumes frais sélectionnés chaque matin au marché de Rungis. Mardi et vendredi après-midi, paiement à la réception, sur Pontault-Combault et l\'est parisien.',
  alternates: { canonical: '/qui-livre' },
};

export default function NosServicesPage() {
  return (
    <main className="bg-[#FAF9F7] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-green-primary transition-colors mb-10"
        >
          <ArrowLeft size={16} strokeWidth={1.5} /> Retour à l&apos;accueil
        </Link>

        <header className="text-center mb-12 md:mb-16">
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-green-primary font-medium mb-4">
            Nos services
          </span>
          <h1 className="text-4xl md:text-5xl font-serif text-neutral-800 mb-5">
            Vos fruits et légumes frais, sélectionnés à Rungis et livrés chez vous.
          </h1>
          <p className="text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            Primeurs Chez Vous, c&apos;est la fraîcheur du marché de Rungis sans bouger de chez vous&nbsp;:
            une sélection à la main chaque matin de livraison, une livraison à domicile l&apos;après-midi,
            et un paiement à la réception. Simple, local, sans abonnement.
          </p>
        </header>

        <article className="prose prose-neutral max-w-none mb-14">
          <p className="text-lg leading-relaxed text-neutral-800">
            Chaque mardi et vendredi, nous partons tôt sélectionner pour vous, dans les allées du
            marché de Rungis, des fruits et légumes frais et de qualité auprès de nos fournisseurs, choisis comme s&apos;ils étaient
            pour notre propre table. Vous composez votre panier en ligne avant la veille 18h, et
            nous vous livrons l&apos;après-midi sur le créneau de votre choix. Le règlement se fait
            à la livraison, en espèces ou par carte&nbsp;: aucun paiement en ligne, aucun frais
            caché, aucun engagement.
          </p>
        </article>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <div className="bg-white border border-neutral-200 p-6">
            <Sunrise size={24} className="text-green-primary mb-3" strokeWidth={1.5} />
            <h2 className="font-serif text-lg text-neutral-800 mb-2">Sélection à Rungis</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Fruits et légumes choisis à la main le matin même, au plus frais et au meilleur de
              leur saison.
            </p>
          </div>
          <div className="bg-white border border-neutral-200 p-6">
            <Truck size={24} className="text-green-primary mb-3" strokeWidth={1.5} />
            <h2 className="font-serif text-lg text-neutral-800 mb-2">Livraison à domicile</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Mardi et vendredi après-midi, créneaux de 2&nbsp;h entre 15h et 21h. Livraison offerte
              dès 55&nbsp;€ de commande.
            </p>
          </div>
          <div className="bg-white border border-neutral-200 p-6">
            <Wallet size={24} className="text-green-primary mb-3" strokeWidth={1.5} />
            <h2 className="font-serif text-lg text-neutral-800 mb-2">Paiement à la réception</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Vous réglez à la livraison. Aucun paiement en ligne, aucun abonnement, aucun frais
              caché.
            </p>
          </div>
          <div className="bg-white border border-neutral-200 p-6">
            <Clock size={24} className="text-green-primary mb-3" strokeWidth={1.5} />
            <h2 className="font-serif text-lg text-neutral-800 mb-2">Commande avant la veille 18h</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Passez commande avant 18h la veille pour être livré le lendemain. Minimum de commande&nbsp;:
              30&nbsp;€.
            </p>
          </div>
          <div className="bg-white border border-neutral-200 p-6">
            <MapPin size={24} className="text-green-primary mb-3" strokeWidth={1.5} />
            <h2 className="font-serif text-lg text-neutral-800 mb-2">Près de chez vous</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Nous livrons Pontault-Combault et les communes de l&apos;est parisien. Voir la{' '}
              <Link href="/zones-livrees" className="text-green-primary underline">zone desservie</Link>.
            </p>
          </div>
          <div className="bg-white border border-neutral-200 p-6">
            <MessageCircle size={24} className="text-green-primary mb-3" strokeWidth={1.5} />
            <h2 className="font-serif text-lg text-neutral-800 mb-2">WhatsApp 7j/7</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Pas de standard, pas de chatbot. Une question ou un créneau à décaler&nbsp;? Écrivez-nous
              directement sur WhatsApp.
            </p>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 p-8 text-center">
          <h2 className="text-2xl font-serif text-neutral-800 mb-3">Prêt à commander ?</h2>
          <p className="text-neutral-600 mb-6 max-w-xl mx-auto">
            Passez commande avant la veille 18 h pour une livraison le lendemain (mardi ou vendredi après-midi).
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/boutique"
              className="inline-flex items-center justify-center gap-2 bg-green-primary text-white px-6 py-3 text-sm uppercase tracking-widest font-medium hover:bg-green-dark transition-colors"
            >
              Voir la boutique
            </Link>
            <a
              href={`https://wa.me/${SITE.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-green-primary text-green-primary px-6 py-3 text-sm uppercase tracking-widest font-medium hover:bg-green-primary hover:text-white transition-colors"
            >
              <MessageCircle size={16} strokeWidth={1.5} /> WhatsApp 7j/7
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

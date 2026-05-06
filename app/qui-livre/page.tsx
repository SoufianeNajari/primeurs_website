import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Phone, Sunrise, Heart, MessageCircle, ArrowLeft } from 'lucide-react';
import { LIVREUR, SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: `Qui livre ? — ${LIVREUR.prenom} | ${SITE.name}`,
  description: `Découvrez ${LIVREUR.prenom}, votre livreur Primeur Chez Vous. Sélection à Rungis chaque matin de livraison, livraison à domicile mardi et samedi.`,
  alternates: { canonical: '/qui-livre' },
};

export default function QuiLivrePage() {
  const phoneHref = `tel:${SITE.telephone.replace(/\s/g, '')}`;

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
            Votre livreur
          </span>
          <h1 className="text-4xl md:text-5xl font-serif text-neutral-800 mb-5">
            {LIVREUR.prenom}, votre primeur de quartier
          </h1>
          <p className="text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            Le visage humain derrière chaque livraison Primeur Chez Vous.
          </p>
        </header>

        <div className="relative w-full aspect-[4/3] md:aspect-[16/9] mb-12 overflow-hidden bg-neutral-100">
          <Image
            src={LIVREUR.photoUrl}
            alt={LIVREUR.photoAlt}
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-cover"
            priority
          />
        </div>

        <article className="prose prose-neutral max-w-none mb-14">
          <p className="text-lg leading-relaxed text-neutral-800">{LIVREUR.bio}</p>
        </article>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          <div className="bg-white border border-neutral-200 p-6">
            <Sunrise size={24} className="text-green-primary mb-3" strokeWidth={1.5} />
            <h3 className="font-serif text-lg text-neutral-800 mb-2">Lever 4h, direction Rungis</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Sélection à la main parmi les producteurs et grossistes que je connais personnellement.
            </p>
          </div>
          <div className="bg-white border border-neutral-200 p-6">
            <Heart size={24} className="text-green-primary mb-3" strokeWidth={1.5} />
            <h3 className="font-serif text-lg text-neutral-800 mb-2">Le même livreur à chaque fois</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Vous me reconnaîtrez. Je vous reconnaîtrai. C&apos;est ça, le commerce de proximité.
            </p>
          </div>
          <div className="bg-white border border-neutral-200 p-6">
            <MessageCircle size={24} className="text-green-primary mb-3" strokeWidth={1.5} />
            <h3 className="font-serif text-lg text-neutral-800 mb-2">Une question ? Vous m&apos;appelez</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Pas de standard, pas de chatbot. Mon numéro direct est sur chaque commande.
            </p>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 p-8 text-center">
          <h2 className="text-2xl font-serif text-neutral-800 mb-3">Prêt à commander ?</h2>
          <p className="text-neutral-600 mb-6 max-w-xl mx-auto">
            Passez commande avant la veille 18 h pour une livraison le lendemain (mardi ou samedi).
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/boutique"
              className="inline-flex items-center justify-center gap-2 bg-green-primary text-white px-6 py-3 text-sm uppercase tracking-widest font-medium hover:bg-green-dark transition-colors"
            >
              Voir la boutique
            </Link>
            <a
              href={phoneHref}
              className="inline-flex items-center justify-center gap-2 border border-green-primary text-green-primary px-6 py-3 text-sm uppercase tracking-widest font-medium hover:bg-green-primary hover:text-white transition-colors"
            >
              <Phone size={16} strokeWidth={1.5} /> {SITE.telephoneDisplay}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

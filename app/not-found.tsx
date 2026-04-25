import Link from 'next/link';
import { Compass, ShoppingBag, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex-grow min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full bg-white border border-neutral-200 p-8 md:p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 text-neutral-400 mb-6">
          <Compass size={32} strokeWidth={1.5} />
        </div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 font-medium mb-2">
          Erreur 404
        </p>
        <h1 className="text-3xl md:text-4xl font-serif text-neutral-800 mb-3">
          Page introuvable
        </h1>
        <p className="text-neutral-500 mb-8 leading-relaxed">
          Cette page n&apos;existe pas ou n&apos;est plus disponible. Retrouvez tous nos produits
          frais en boutique.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/boutique"
            className="inline-flex items-center justify-center gap-2 bg-green-primary hover:bg-green-dark text-white px-6 py-3 text-sm uppercase tracking-widest font-medium transition-colors"
          >
            <ShoppingBag size={16} />
            Voir la boutique
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 border border-neutral-300 hover:border-green-primary text-neutral-700 px-6 py-3 text-sm uppercase tracking-widest font-medium transition-colors"
          >
            <Home size={16} />
            Accueil
          </Link>
        </div>
      </div>
    </main>
  );
}

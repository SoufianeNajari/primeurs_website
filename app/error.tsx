'use client';

import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex-grow min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full bg-white border border-neutral-200 p-8 md:p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-soft text-red-text mb-6">
          <AlertTriangle size={32} strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl md:text-4xl font-serif text-neutral-800 mb-3">
          Une erreur est survenue
        </h1>
        <p className="text-neutral-500 mb-8 leading-relaxed">
          Désolé, quelque chose s&apos;est mal passé. Vous pouvez réessayer ou revenir à
          l&apos;accueil.
        </p>
        {error.digest && (
          <p className="text-[11px] uppercase tracking-widest text-neutral-400 mb-6">
            Référence : {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-green-primary hover:bg-green-dark text-white px-6 py-3 text-sm uppercase tracking-widest font-medium transition-colors"
          >
            <RefreshCw size={16} />
            Réessayer
          </button>
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

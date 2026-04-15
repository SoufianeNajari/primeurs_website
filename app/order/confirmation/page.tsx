'use client'

import { useEffect, useState, Suspense } from 'react';
import { useCart } from '@/components/CartContext';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Calendar } from 'lucide-react';

function ConfirmationContent() {
  const { clearCart } = useCart();
  const searchParams = useSearchParams();
  const [jourRetrait, setJourRetrait] = useState<string | null>(null);

  // Vider le panier au montage de la page et récupérer le jour
  useEffect(() => {
    clearCart();
    setJourRetrait(searchParams.get('jour'));
  }, [clearCart, searchParams]);

  return (
    <div className="max-w-lg w-full bg-white border border-neutral-200 p-10 md:p-12 text-center animate-fade-in-up">
      
      <div className="mx-auto mb-8 flex justify-center">
        <CheckCircle2 size={48} className="text-green-primary" strokeWidth={1.5} />
      </div>
      
      <h1 className="text-4xl font-serif text-neutral-800 mb-6">Commande validée</h1>
      
      <p className="text-neutral-600 mb-10 text-lg leading-relaxed">
        Nous vous remercions de votre confiance. Un e-mail récapitulatif vient de vous être envoyé.
      </p>

      {jourRetrait && (
        <div className="bg-neutral-50 border border-neutral-200 p-6 mb-10 flex flex-col items-center">
          <Calendar size={24} className="text-neutral-400 mb-3" strokeWidth={1.5} />
          <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-[0.2em] mb-2">Jour de retrait prévu</span>
          <span className="text-2xl font-serif text-neutral-800">{jourRetrait}</span>
        </div>
      )}

      <div className="space-y-6">
        <p className="text-sm text-neutral-500 italic">
          Le règlement s&apos;effectuera directement en boutique lors du retrait de votre commande.
        </p>
        <Link 
          href="/"
          className="flex items-center justify-center w-full bg-white text-green-primary border border-green-primary py-4 px-6 font-medium text-sm uppercase tracking-widest hover:bg-green-primary hover:text-white transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>

    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <main className="flex-grow flex items-center justify-center py-16 px-4 bg-neutral-50 min-h-screen">
      <Suspense fallback={<div className="text-center p-10 font-serif text-lg text-neutral-500">Chargement de votre confirmation...</div>}>
        <ConfirmationContent />
      </Suspense>
    </main>
  );
}

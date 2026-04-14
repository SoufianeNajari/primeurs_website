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
    <div className="max-w-md w-full bg-white rounded-3xl shadow-lg border border-neutral-100 p-8 md:p-10 text-center animate-fade-in-up">
      
      <div className="mx-auto w-20 h-20 bg-green-light rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 size={40} className="text-green-primary" />
      </div>
      
      <h1 className="text-3xl font-black text-neutral-700 mb-4 tracking-tight">Commande validée !</h1>
      
      <p className="text-neutral-700 mb-8 text-lg">
        Merci pour votre confiance. Un e-mail de confirmation vient de vous être envoyé.
      </p>

      {jourRetrait && (
        <div className="bg-green-light border border-[#d1ebe1] rounded-2xl p-6 mb-8 flex flex-col items-center">
          <Calendar size={28} className="text-green-primary mb-2" />
          <span className="text-sm font-bold text-green-primary uppercase tracking-wide">Jour de retrait</span>
          <span className="text-2xl font-black text-neutral-700 mt-1">{jourRetrait}</span>
        </div>
      )}

      <div className="space-y-4">
        <p className="text-sm text-neutral-400 font-medium">
          N&apos;oubliez pas que le paiement s&apos;effectuera directement en magasin.
        </p>
        <Link 
          href="/"
          className="flex items-center justify-center w-full bg-green-primary text-white py-3.5 px-6 rounded-xl font-bold text-lg hover:bg-green-dark transition-all active:translate-y-px hover:-translate-y-[1px] shadow-sm"
        >
          Retour à l&apos;accueil
        </Link>
      </div>

    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <main className="flex-grow flex items-center justify-center py-12 px-4 bg-gray-50 min-h-screen">
      <Suspense fallback={<div className="text-center p-10">Chargement...</div>}>
        <ConfirmationContent />
      </Suspense>
    </main>
  );
}


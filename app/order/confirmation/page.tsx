'use client'

import { useEffect, useState, Suspense } from 'react';
import { useCart, type CartItem } from '@/components/CartContext';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Calendar, Info } from 'lucide-react';
import { cartHasPoidsIncertain } from '@/lib/produit';

function ConfirmationContent() {
  const { clearCart } = useCart();
  const searchParams = useSearchParams();
  const [jourRetrait, setJourRetrait] = useState<string | null>(null);
  const [creneau, setCreneau] = useState<string | null>(null);
  const [hadIncertain, setHadIncertain] = useState(false);

  // Vider le panier au montage de la page et récupérer le jour / créneau.
  // On lit `primeur_last_order` AVANT de vider pour savoir si la commande
  // contenait des produits dont le prix sera fixé à la remise.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('primeur_last_order');
      if (raw) {
        const items = JSON.parse(raw) as CartItem[];
        if (Array.isArray(items)) setHadIncertain(cartHasPoidsIncertain(items));
      }
    } catch {
      // ignore
    }
    clearCart();
    setJourRetrait(searchParams.get('jour'));
    setCreneau(searchParams.get('creneau'));
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
          <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-[0.2em] mb-2">Retrait prévu</span>
          <span className="text-2xl font-serif text-neutral-800">{jourRetrait}</span>
          {creneau && <span className="text-lg text-green-primary mt-1">Créneau&nbsp;: {creneau}</span>}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-neutral-50 border border-neutral-200 p-4 flex gap-3 items-start text-left text-sm text-neutral-600">
          <Info size={18} strokeWidth={1.5} className="text-green-primary shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            {hadIncertain
              ? 'Certains produits seront pesés et tarifés à la remise. Nous vous communiquons le prix exact lors du retrait.'
              : 'Si l’écart de prix dépasse la fourchette annoncée, nous vous contactons avant préparation.'}
          </span>
        </div>
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

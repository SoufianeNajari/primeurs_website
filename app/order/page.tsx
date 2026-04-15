'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartContext';
import { Loader2, ArrowLeft, ShoppingBag, AlertTriangle, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function OrderPage() {
  const { cart, totalItems, removeFromCart } = useCart();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && totalItems === 0) {
      router.push('/');
    }
  }, [isMounted, totalItems, router]);

  if (!isMounted || totalItems === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-green-primary" size={32} />
      </div>
    );
  }

  const cartItems = Object.values(cart);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const client = {
      prenom: formData.get('prenom') as string,
      nom: formData.get('nom') as string,
      telephone: formData.get('telephone') as string,
      email: formData.get('email') as string,
    };
    const jourRetrait = formData.get('jourRetrait') as string;
    const message = formData.get('message') as string;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(client.email)) {
      setError("Format d'e-mail invalide.");
      setIsSubmitting(false);
      return;
    }

    const phoneDigitCount = client.telephone.replace(/\D/g, '').length;
    if (phoneDigitCount < 10) {
      setError("Le numéro de téléphone doit contenir au moins 10 chiffres.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client,
          panier: cartItems,
          jourRetrait,
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la commande');
      }

      router.push(`/order/confirmation?jour=${encodeURIComponent(jourRetrait)}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Une erreur est survenue, veuillez réessayer.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-grow py-8 px-4 bg-neutral-50 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="flex items-center gap-4 mb-6">
          <Link href="/boutique" className="p-2 bg-white rounded-sm border border-neutral-200 hover:bg-neutral-50 transition-colors text-neutral-600">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </Link>
          <h1 className="text-3xl font-serif text-neutral-800">Finaliser la commande</h1>
        </div>

        <div className="bg-white border border-neutral-200">
          <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex items-center gap-3">
            <ShoppingBag className="text-green-primary" size={20} strokeWidth={1.5} />
            <h2 className="text-lg font-serif text-neutral-800">Récapitulatif ({totalItems} articles)</h2>
          </div>
          <ul className="divide-y divide-neutral-100 px-6">
            {cartItems.map((item) => (
              <li key={item.produitId} className="py-5 flex justify-between items-center">
                <div>
                  <span className="font-serif text-lg text-neutral-800 block">{item.nom}</span>
                  <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium">{item.categorie}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-neutral-50 px-4 py-2 border border-neutral-200 font-medium text-neutral-700 text-sm">
                    x {item.quantite}
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeFromCart(item.produitId)}
                    className="text-neutral-400 hover:text-red-text transition-colors p-2 -mr-2"
                    aria-label={`Retirer ${item.nom} du panier`}
                  >
                    <Trash2 size={18} strokeWidth={1.5} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-serif text-neutral-800 border-b border-neutral-200 pb-4">
            Vos informations
          </h2>

          {error && (
            <div className="bg-red-soft text-red-text p-4 border border-red-text/20 text-sm font-medium flex items-start gap-3">
              <AlertTriangle className="shrink-0 mt-0.5" size={18} strokeWidth={1.5} />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="prenom" className="block text-xs uppercase tracking-wider text-neutral-600">Prénom *</label>
              <input 
                type="text" id="prenom" name="prenom" required 
                className="w-full px-4 py-3 border border-neutral-300 rounded-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none transition-colors"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="nom" className="block text-xs uppercase tracking-wider text-neutral-600">Nom *</label>
              <input 
                type="text" id="nom" name="nom" required 
                className="w-full px-4 py-3 border border-neutral-300 rounded-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs uppercase tracking-wider text-neutral-600">E-mail *</label>
              <input 
                type="email" id="email" name="email" required 
                className="w-full px-4 py-3 border border-neutral-300 rounded-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="telephone" className="block text-xs uppercase tracking-wider text-neutral-600">Téléphone *</label>
              <input 
                type="tel" id="telephone" name="telephone" required 
                className="w-full px-4 py-3 border border-neutral-300 rounded-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <label htmlFor="jourRetrait" className="block text-xs uppercase tracking-wider text-neutral-600">Jour de retrait souhaité *</label>
            <select 
              id="jourRetrait" name="jourRetrait" required
              className="w-full px-4 py-3 border border-neutral-300 rounded-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none transition-colors bg-white font-medium text-neutral-700"
            >
              <option value="">Sélectionnez un jour...</option>
              <option value="Lundi">Lundi</option>
              <option value="Mardi">Mardi</option>
              <option value="Mercredi">Mercredi</option>
              <option value="Jeudi">Jeudi</option>
              <option value="Vendredi">Vendredi</option>
              <option value="Samedi">Samedi</option>
            </select>
          </div>

          <div className="space-y-2 pt-2">
            <label htmlFor="message" className="block text-xs uppercase tracking-wider text-neutral-600">Commentaire (optionnel)</label>
            <textarea 
              id="message" name="message" rows={3}
              className="w-full px-4 py-3 border border-neutral-300 rounded-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none transition-colors resize-none"
            ></textarea>
          </div>

          <div className="pt-8">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-green-primary text-white py-4 px-6 font-serif text-lg hover:bg-green-dark transition-colors disabled:bg-neutral-300 disabled:opacity-100 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-green-primary disabled:border-neutral-300"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} strokeWidth={2} />
                  Envoi en cours...
                </>
              ) : (
                'Confirmer la commande'
              )}
            </button>
            <p className="text-center text-sm text-neutral-500 mt-4 italic">
              Le règlement s&apos;effectue directement en boutique lors du retrait.
            </p>
          </div>
        </form>

      </div>
    </main>
  );
}

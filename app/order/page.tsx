'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartContext';
import { Loader2, ArrowLeft, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function OrderPage() {
  const { cart, totalItems } = useCart();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // S'assurer que le composant est monté côté client avant de vérifier le panier
  // pour éviter les erreurs d'hydratation (SSR vs Client)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirection si le panier est vide
  useEffect(() => {
    if (isMounted && totalItems === 0) {
      router.push('/');
    }
  }, [isMounted, totalItems, router]);

  if (!isMounted || totalItems === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#1D9E75]" size={32} />
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

    // Validation basique côté client
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

      // Succès -> redirection vers confirmation
      // On passe le jour de retrait en paramètre URL pour l'afficher
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
    <main className="flex-grow py-8 px-4 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="flex items-center gap-4 mb-6">
          <Link href="/boutique" className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-100 transition-colors text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Finaliser ma commande</h1>
        </div>

        {/* Récapitulatif du panier */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <ShoppingBag className="text-[#1D9E75]" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Récapitulatif ({totalItems} articles)</h2>
          </div>
          <ul className="divide-y divide-gray-100 px-6">
            {cartItems.map((item) => (
              <li key={item.produitId} className="py-4 flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-900 block">{item.nom}</span>
                  <span className="text-xs text-gray-500 font-medium">{item.categorie}</span>
                </div>
                <div className="bg-gray-100 px-3 py-1 rounded-md font-bold text-gray-700">
                  x {item.quantite}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Formulaire de commande */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 border-b border-gray-100 pb-4">
            Vos informations
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="prenom" className="block text-sm font-bold text-gray-700">Prénom *</label>
              <input 
                type="text" id="prenom" name="prenom" required 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1D9E75] focus:border-[#1D9E75] outline-none transition-colors"
                placeholder="Jean"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="nom" className="block text-sm font-bold text-gray-700">Nom *</label>
              <input 
                type="text" id="nom" name="nom" required 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1D9E75] focus:border-[#1D9E75] outline-none transition-colors"
                placeholder="Dupont"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-bold text-gray-700">E-mail *</label>
              <input 
                type="email" id="email" name="email" required 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1D9E75] focus:border-[#1D9E75] outline-none transition-colors"
                placeholder="jean.dupont@email.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="telephone" className="block text-sm font-bold text-gray-700">Téléphone *</label>
              <input 
                type="tel" id="telephone" name="telephone" required 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1D9E75] focus:border-[#1D9E75] outline-none transition-colors"
                placeholder="06 12 34 56 78"
              />
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <label htmlFor="jourRetrait" className="block text-sm font-bold text-gray-700">Jour de retrait souhaité *</label>
            <select 
              id="jourRetrait" name="jourRetrait" required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1D9E75] focus:border-[#1D9E75] outline-none transition-colors bg-white font-medium"
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
            <label htmlFor="message" className="block text-sm font-bold text-gray-700">Commentaire ou précision (optionnel)</label>
            <textarea 
              id="message" name="message" rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1D9E75] focus:border-[#1D9E75] outline-none transition-colors resize-none"
              placeholder="Ex: Je passerai vers 17h..."
            ></textarea>
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Envoi en cours...
                </>
              ) : (
                'Confirmer ma commande'
              )}
            </button>
            <p className="text-center text-sm text-gray-500 mt-4">
              Le paiement s&apos;effectuera directement en magasin lors du retrait.
            </p>
          </div>
        </form>

      </div>
    </main>
  );
}

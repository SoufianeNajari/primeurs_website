'use client'

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, cartKey } from '@/components/CartContext';
import { Loader2, ArrowLeft, ShoppingBag, AlertTriangle, Trash2, Info } from 'lucide-react';
import Link from 'next/link';
import { JOURS_RETRAIT } from '@/lib/creneaux';
import { formatPrixMontant, cartHasPoidsIncertain, isPoidsIncertain } from '@/lib/produit';
import { calcFourchette, formatFourchette } from '@/lib/fourchette';
import { useFourchetteBornes } from '@/lib/use-fourchette';

// JS getDay() : 0=dim, 1=lun, 2=mar, …, 6=sam
const JOUR_INDEX_TO_KEY = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] as const;

export default function OrderPage() {
  const { cart, totalItems, totalEstime, removeFromCart } = useCart();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dateRetrait, setDateRetrait] = useState('');
  const bornes = useFourchetteBornes();

  // On dérive le jour de retrait (libellé "Mardi" / …) depuis la date choisie :
  // un seul champ visible côté client. Le lundi (getDay() === 1) renvoie null
  // = boutique fermée, géré par la validation.
  const jourFromDate = useMemo(() => {
    if (!dateRetrait) return null;
    const d = new Date(dateRetrait + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return null;
    const key = JOUR_INDEX_TO_KEY[d.getDay()];
    return JOURS_RETRAIT.find((j) => j.key === key) || null;
  }, [dateRetrait]);
  const creneaux = jourFromDate?.creneaux ?? [];
  const isDateInvalid = !!dateRetrait && !jourFromDate;
  const dateLabel = useMemo(() => {
    if (!dateRetrait) return null;
    const d = new Date(dateRetrait + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }, [dateRetrait]);

  // Bornes du date picker : J+1 → J+14, en évitant le lundi (boutique fermée).
  // L'attribut HTML5 `min`/`max` ne peut pas exclure les lundis ; on valide
  // côté client + côté API.
  const { dateMin, dateMax } = useMemo(() => {
    const today = new Date();
    const min = new Date(today);
    min.setDate(min.getDate() + 1);
    const max = new Date(today);
    max.setDate(max.getDate() + 14);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return { dateMin: fmt(min), dateMax: fmt(max) };
  }, []);

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
  const hasIncertain = cartHasPoidsIncertain(cartItems);
  const fourchette = totalEstime != null && !hasIncertain ? calcFourchette(totalEstime, bornes) : null;

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
    const dateRetraitSouhaite = (formData.get('dateRetraitSouhaite') as string) || '';
    const creneau = (formData.get('creneau') as string) || null;
    const message = formData.get('message') as string;

    if (!dateRetraitSouhaite) {
      setError('Choisis une date de retrait.');
      setIsSubmitting(false);
      return;
    }
    if (!jourFromDate) {
      setError('La boutique est fermée le lundi. Choisis un autre jour.');
      setIsSubmitting(false);
      return;
    }
    const jourRetrait = jourFromDate.label;

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
          creneau,
          dateRetraitSouhaite,
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la commande');
      }

      // Sauvegarde du panier pour la fonctionnalité "Historique magique"
      localStorage.setItem('primeur_last_order', JSON.stringify(cartItems));

      const params = new URLSearchParams({ jour: jourRetrait });
      if (creneau) params.set('creneau', creneau);
      router.push(`/order/confirmation?${params.toString()}`);
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
            {cartItems.map((item) => {
              const key = cartKey(item.produitId, item.optionId);
              const prix = formatPrixMontant(item.prix ?? null);
              return (
                <li key={key} className="py-5 flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <span className="font-serif text-lg text-neutral-800 block truncate">{item.nom}</span>
                    <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium">{item.categorie}</span>
                    <span className="block text-sm text-green-dark font-medium mt-1">
                      {item.libelle}
                      {isPoidsIncertain(item) ? (
                        <span className="text-neutral-500 font-normal italic"> · Prix à la remise</span>
                      ) : prix ? (
                        <span className="text-neutral-500 font-normal"> · {prix}</span>
                      ) : null}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="bg-neutral-50 px-4 py-2 border border-neutral-200 font-medium text-neutral-700 text-sm">
                      x {item.quantite}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(key)}
                      className="text-neutral-400 hover:text-red-text transition-colors p-2 -mr-2"
                      aria-label={`Retirer ${item.nom} du panier`}
                    >
                      <Trash2 size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {hasIncertain ? (
            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex gap-3 items-start text-sm text-neutral-600">
              <Info size={18} strokeWidth={1.5} className="text-green-primary shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                Votre panier contient des produits dont le poids sera déterminé à la remise.
                Le prix final vous sera communiqué lors du retrait. Paiement sur place.
              </span>
            </div>
          ) : (
            <>
              {totalEstime != null && (
                <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-widest text-neutral-600 font-medium">Sous-total estimé</span>
                  <span className="text-base font-serif text-neutral-700">{totalEstime.toFixed(2).replace('.', ',')}&nbsp;€</span>
                </div>
              )}
              {fourchette && (
                <div className="px-6 py-3 bg-neutral-50 flex items-baseline justify-between border-t border-neutral-100">
                  <span className="text-xs uppercase tracking-widest text-neutral-600 font-medium">Total final</span>
                  <span className="text-xl font-serif text-neutral-800">{formatFourchette(fourchette)}</span>
                </div>
              )}
              {fourchette && (
                <p className="px-6 pb-4 pt-2 text-xs text-neutral-500 italic bg-neutral-50">
                  Prix indicatif, ajusté à la remise (cours du jour, poids réel). Si l&apos;écart dépasse la fourchette, nous vous contactons avant préparation. Paiement sur place.
                </p>
              )}
            </>
          )}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="space-y-2">
              <label htmlFor="dateRetraitSouhaite" className="block text-xs uppercase tracking-wider text-neutral-600">Date de retrait *</label>
              <input
                type="date" id="dateRetraitSouhaite" name="dateRetraitSouhaite" required
                min={dateMin} max={dateMax}
                value={dateRetrait}
                onChange={(e) => setDateRetrait(e.target.value)}
                className="w-full px-4 py-3 border border-neutral-300 rounded-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none transition-colors bg-white font-medium text-neutral-700"
              />
              {isDateInvalid ? (
                <p className="text-[11px] text-red-text font-medium">
                  Boutique fermée le lundi — choisis un autre jour.
                </p>
              ) : dateLabel && jourFromDate ? (
                <p className="text-[11px] text-green-primary font-medium capitalize">{dateLabel}</p>
              ) : (
                <p className="text-[11px] text-neutral-500 italic">Du mardi au dimanche, dans les 14 jours.</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="creneau" className="block text-xs uppercase tracking-wider text-neutral-600">Créneau horaire *</label>
              <select
                id="creneau" name="creneau" required
                disabled={!jourFromDate}
                className="w-full px-4 py-3 border border-neutral-300 rounded-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none transition-colors bg-white font-medium text-neutral-700 disabled:bg-neutral-100 disabled:text-neutral-400"
              >
                <option value="">{jourFromDate ? 'Choisissez un créneau…' : 'Choisis d\'abord une date'}</option>
                {creneaux.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
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

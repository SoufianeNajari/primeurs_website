'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Check, Sparkles } from 'lucide-react';
import { useCart, cartKey } from '@/components/CartContext';
import type { UpsellSuggestion } from '@/app/api/upsell/route';
import { triggerHaptic } from '@/lib/haptic';

const FALLBACK_IMG = '/icons/icon-192x192.png';

export default function UpsellSuggestions() {
  const { cart, addToCart } = useCart();
  const [suggestions, setSuggestions] = useState<UpsellSuggestion[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const cartItems = Object.values(cart);
      const excludeIds = Array.from(new Set(cartItems.map((i) => i.produitId)));
      try {
        const res = await fetch('/api/upsell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ excludeIds }),
        });
        if (!res.ok) throw new Error('Erreur');
        const data = (await res.json()) as { suggestions: UpsellSuggestion[] };
        if (!cancelled) setSuggestions(data.suggestions || []);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
    // Volontairement : on ne refetch pas à chaque changement de cart pour ne
    // pas faire valser les suggestions au moment où l'utilisateur en clique
    // une. Si l'utilisateur ajoute une suggestion, l'état « Ajouté » suffit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !suggestions || suggestions.length === 0) return null;

  return (
    <section className="bg-white border border-neutral-200">
      <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex items-center gap-3">
        <Sparkles className="text-green-primary" size={20} strokeWidth={1.5} />
        <h2 className="text-lg font-serif text-neutral-800">Coups de cœur des primeurs</h2>
      </div>
      <p className="px-6 pt-4 text-sm text-neutral-500 italic">
        Une sélection que nous aimons particulièrement en ce moment.
      </p>
      <ul className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {suggestions.map((s) => {
          const inCart = !!cart[cartKey(s.id, s.option.id)];
          return (
            <li key={s.id} className="border border-neutral-200 bg-white p-3 flex gap-3 items-center">
              <div className="w-16 h-16 shrink-0 bg-neutral-50 border border-neutral-200 overflow-hidden relative">
                <Image
                  src={s.image_url || FALLBACK_IMG}
                  alt={s.nom}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium">
                  {s.categorie}
                </div>
                <div className="font-serif text-base text-neutral-800 truncate">{s.nom}</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {s.option.prix != null
                    ? `${s.option.prix.toFixed(2).replace('.', ',')} € · ${s.option.libelle}`
                    : `${s.option.libelle} · à peser`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (inCart) return;
                  triggerHaptic();
                  addToCart({
                    produitId: s.id,
                    optionId: s.option.id,
                    nom: s.nom,
                    categorie: s.categorie,
                    libelle: s.option.libelle,
                    prix: s.option.prix,
                  });
                }}
                disabled={inCart}
                aria-label={inCart ? `${s.nom} déjà dans le panier` : `Ajouter ${s.nom} au panier`}
                className={`shrink-0 w-10 h-10 inline-flex items-center justify-center border transition-colors ${
                  inCart
                    ? 'border-green-primary text-green-primary bg-green-soft/30 cursor-default'
                    : 'border-green-primary text-green-primary hover:bg-green-primary hover:text-white'
                }`}
              >
                {inCart ? <Check size={18} strokeWidth={2} /> : <Plus size={18} strokeWidth={2} />}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

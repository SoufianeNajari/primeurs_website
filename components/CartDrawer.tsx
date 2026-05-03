'use client'

import { useCart, CartItem, cartKey } from './CartContext';
import CartItemNote from './CartItemNote';
import { X, ShoppingBag, Minus, Plus, Trash2, RotateCcw, Loader2, Sparkles } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FocusTrap } from 'focus-trap-react';
import { triggerHaptic } from '@/lib/haptic';
import { supabase } from '@/lib/supabase';
import type { ProduitOption } from '@/lib/produit';
import { formatPrixMontant, cartHasPoidsIncertain, isPoidsIncertain } from '@/lib/produit';
import { calcFourchette, formatFourchette } from '@/lib/fourchette';
import { useFourchetteBornes } from '@/lib/use-fourchette';
import { Info } from 'lucide-react';

type Suggestion = {
  id: string;
  nom: string;
  categorie: string;
  disponible: boolean;
  options: ProduitOption[] | null;
};

export default function CartDrawer() {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, addToCart, totalItems, totalEstime, restoreCart } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [lastOrder, setLastOrder] = useState<CartItem[] | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const cartItems = Object.values(cart);
  const bornes = useFourchetteBornes();
  const hasIncertain = cartHasPoidsIncertain(cartItems);
  const fourchette = totalEstime != null && !hasIncertain ? calcFourchette(totalEstime, bornes) : null;

  // Charger le dernier panier s'il existe
  useEffect(() => {
    if (isCartOpen && cartItems.length === 0) {
      const saved = localStorage.getItem('primeur_last_order');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLastOrder(parsed);
          }
        } catch {
          // ignore
        }
      }
    }
  }, [isCartOpen, cartItems.length]);

  // Charger des suggestions (Cross-selling)
  useEffect(() => {
    if (isCartOpen && cartItems.length > 0) {
      const fetchSuggestions = async () => {
        try {
          const cartIds = Array.from(new Set(cartItems.map((item) => item.produitId)));
          const { data } = await supabase
            .from('produits')
            .select('id, nom, categorie, disponible, options')
            .eq('disponible', true)
            .eq('masque_boutique', false)
            .limit(50);

          if (data) {
            const availableSuggestions = (data as Suggestion[]).filter((p) => !cartIds.includes(p.id));

            const keywordsInCart = cartItems
              .map((i) => i.nom.toLowerCase() + ' ' + i.categorie.toLowerCase())
              .join(' ');

            const scored = availableSuggestions.map((p) => {
              let score = 0;
              const n = p.nom.toLowerCase();
              const c = p.categorie.toLowerCase();
              if (keywordsInCart.includes('tomate') && (n.includes('basilic') || n.includes('mozzarella') || n.includes('oignon'))) score += 5;
              if (keywordsInCart.includes('fraise') && (n.includes('crème') || n.includes('sucre') || n.includes('menthe'))) score += 5;
              if (keywordsInCart.includes('fromage') && (n.includes('confiture') || n.includes('miel') || n.includes('pain') || n.includes('vin'))) score += 5;
              if (keywordsInCart.includes('salade') && (n.includes('radis') || n.includes('tomate') || n.includes('concombre'))) score += 4;
              if (keywordsInCart.includes('pomme') && (n.includes('poire') || n.includes('kiwi'))) score += 3;
              if (keywordsInCart.includes('légume') && c.includes('herbe')) score += 2;
              score += Math.random();
              return { p, score };
            });

            const best = scored.sort((a, b) => b.score - a.score).slice(0, 2).map((s) => s.p);
            setSuggestions(best);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCartOpen, cartItems.length]);

  useEffect(() => {
    if (isCartOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCartOpen]);

  useEffect(() => {
    setIsCartOpen(false);
  }, [pathname, setIsCartOpen]);

  const handleRestore = async () => {
    if (!lastOrder) return;
    setIsRestoring(true);
    triggerHaptic();

    const productIds = Array.from(new Set(lastOrder.map((i) => i.produitId)));

    try {
      const { data: produitsDb } = await supabase
        .from('produits')
        .select('id, disponible, options')
        .in('id', productIds);

      if (produitsDb) {
        const dbMap = new Map((produitsDb as { id: string; disponible: boolean; options: ProduitOption[] | null }[]).map((p) => [p.id, p]));
        const validItems = lastOrder
          .map((item) => {
            const db = dbMap.get(item.produitId);
            if (!db || !db.disponible) return null;
            const opt = (db.options || []).find((o) => o.id === item.optionId);
            if (!opt) return null;
            return { ...item, libelle: opt.libelle, prix: opt.prix ?? null } as CartItem;
          })
          .filter((i): i is CartItem => i != null);

        if (validItems.length > 0) {
          restoreCart(validItems);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRestoring(false);
    }
  };

  useEffect(() => {
    if (!isCartOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCartOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isCartOpen, setIsCartOpen]);

  if (!isCartOpen) return null;

  const handleAddSuggestion = (s: Suggestion) => {
    const opts = s.options || [];
    if (opts.length === 0) return;
    // Si plusieurs options, on redirige vers la fiche pour laisser le choix
    if (opts.length > 1) {
      setIsCartOpen(false);
      // Pas de slug fourni ici ; on ouvre simplement la boutique
      router.push('/boutique');
      return;
    }
    const opt = opts[0];
    triggerHaptic();
    addToCart({
      produitId: s.id,
      optionId: opt.id,
      nom: s.nom,
      categorie: s.categorie,
      libelle: opt.libelle,
      prix: opt.prix ?? null,
      quantite: 1,
    });
  };

  return (
    <FocusTrap focusTrapOptions={{ allowOutsideClick: true, escapeDeactivates: false }}>
    <div
      className="fixed inset-0 z-[100] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">

        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200 bg-neutral-50">
          <h2 id="cart-drawer-title" className="text-xl font-serif text-neutral-800 flex items-center gap-3">
            <ShoppingBag className="text-green-primary" size={24} strokeWidth={1.5} />
            Votre Panier ({totalItems})
          </h2>
          <button
            onClick={() => setIsCartOpen(false)}
            className="text-neutral-400 hover:text-neutral-800 transition-colors p-2 -mr-2"
            aria-label="Fermer le panier"
          >
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto px-6 py-4">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-6">
              <div className="w-24 h-24 bg-neutral-50 rounded-full flex items-center justify-center border border-neutral-200">
                <ShoppingBag size={40} strokeWidth={1} className="text-neutral-300" />
              </div>
              <p className="font-serif text-xl text-neutral-600">Votre panier est vide.</p>

              {lastOrder && (
                <div className="w-full pt-4">
                  <button
                    onClick={handleRestore}
                    disabled={isRestoring}
                    className="w-full bg-neutral-50 text-neutral-800 border border-neutral-200 py-4 font-medium flex items-center justify-center gap-2 transition-colors hover:bg-neutral-100 focus:outline-none uppercase tracking-widest text-[11px] disabled:opacity-50 shadow-sm"
                  >
                    {isRestoring ? (
                      <Loader2 className="animate-spin" size={16} strokeWidth={2} />
                    ) : (
                      <RotateCcw size={16} strokeWidth={1.5} />
                    )}
                    {isRestoring ? 'Restauration...' : 'Recommander mon dernier panier'}
                  </button>
                  <p className="text-center text-[10px] text-neutral-400 mt-2 uppercase tracking-widest">
                    Uniquement les produits disponibles
                  </p>
                </div>
              )}

              <button
                onClick={() => setIsCartOpen(false)}
                className="text-sm font-medium uppercase tracking-widest text-green-primary hover:text-green-dark border-b border-green-primary pb-1 mt-6"
              >
                Continuer mes achats
              </button>
            </div>
          ) : (
            <ul className="space-y-6">
              {cartItems.map((item) => {
                const key = cartKey(item.produitId, item.optionId);
                const prixLabel = formatPrixMontant(item.prix ?? null);
                return (
                  <li key={key} className="flex flex-col gap-3 pb-6 border-b border-neutral-100 last:border-0">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <span className="font-serif text-lg text-neutral-800 block leading-snug truncate">{item.nom}</span>
                        <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium">{item.categorie}</span>
                        <span className="block text-sm text-green-dark font-medium mt-1">
                          {item.libelle}
                          {isPoidsIncertain(item) ? (
                            <span className="text-neutral-500 font-normal italic"> · Prix à la remise</span>
                          ) : prixLabel ? (
                            <span className="text-neutral-500 font-normal"> · {prixLabel}</span>
                          ) : null}
                        </span>
                      </div>
                      <button
                        onClick={() => { triggerHaptic(); removeFromCart(key); }}
                        className="text-neutral-300 hover:text-red-text transition-colors p-2 -mr-2 -mt-2 shrink-0"
                        aria-label={`Retirer ${item.nom}`}
                      >
                        <Trash2 size={18} strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between border border-neutral-300 p-1 w-36 bg-neutral-50">
                      <button
                        onClick={() => { triggerHaptic(); updateQuantity(key, item.quantite - 1); }}
                        className="w-9 h-9 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"
                        aria-label="Diminuer la quantité"
                      >
                        <Minus size={16} strokeWidth={1.5} />
                      </button>
                      <span className="font-medium text-neutral-800 text-sm w-10 text-center">{item.quantite}</span>
                      <button
                        onClick={() => { triggerHaptic(); updateQuantity(key, item.quantite + 1); }}
                        className="w-9 h-9 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"
                        aria-label="Augmenter la quantité"
                      >
                        <Plus size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                    <CartItemNote itemKey={key} />
                  </li>
                );
              })}
            </ul>
          )}

          {cartItems.length > 0 && suggestions.length > 0 && (
            <div className="mt-8 pt-6 border-t border-neutral-200">
              <h3 className="text-[11px] uppercase tracking-widest font-medium text-neutral-500 mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-green-primary" strokeWidth={1.5} />
                S&apos;accorde parfaitement avec
              </h3>
              <ul className="space-y-4">
                {suggestions.map((s) => {
                  const multi = (s.options?.length ?? 0) > 1;
                  return (
                    <li key={s.id} className="flex items-center justify-between bg-neutral-50 border border-neutral-200 p-3">
                      <div className="min-w-0">
                        <span className="font-serif text-neutral-800 block leading-snug truncate">{s.nom}</span>
                        <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium">{s.categorie}</span>
                      </div>
                      <button
                        onClick={() => handleAddSuggestion(s)}
                        className="text-green-primary hover:text-white hover:bg-green-primary border border-green-primary w-10 h-10 flex items-center justify-center transition-colors focus:outline-none shrink-0 ml-3"
                        aria-label={multi ? `Voir les options pour ${s.nom}` : `Ajouter ${s.nom}`}
                      >
                        <Plus size={16} strokeWidth={1.5} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="border-t border-neutral-200 p-6 bg-neutral-50 space-y-4">
            {hasIncertain ? (
              <div className="flex gap-3 items-start text-xs text-neutral-600 bg-white border border-neutral-200 p-3">
                <Info size={16} strokeWidth={1.5} className="text-green-primary shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Votre panier contient des produits dont le poids sera déterminé à la remise.
                  Le prix final vous sera communiqué lors du retrait. Paiement sur place.
                </span>
              </div>
            ) : (
              <>
                {totalEstime != null && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-widest text-neutral-500 font-medium">Sous-total estimé</span>
                    <span className="text-base font-serif text-neutral-700">{totalEstime.toFixed(2).replace('.', ',')}&nbsp;€</span>
                  </div>
                )}
                {fourchette && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-widest text-neutral-500 font-medium">Total final</span>
                    <span className="text-xl font-serif text-neutral-800">{formatFourchette(fourchette)}</span>
                  </div>
                )}
                {fourchette && (
                  <div className="flex gap-2 items-start text-[11px] text-neutral-500 leading-relaxed">
                    <Info size={13} strokeWidth={1.5} className="shrink-0 mt-0.5 text-neutral-400" />
                    <span>Prix indicatif, ajusté à la remise (cours du jour, poids réel). Paiement sur place.</span>
                  </div>
                )}
              </>
            )}
            <button
              onClick={() => {
                setIsCartOpen(false);
                router.push('/order');
              }}
              className="w-full bg-green-primary text-white py-4 font-serif text-lg hover:bg-green-dark transition-colors border border-green-primary flex justify-center items-center gap-3 shadow-lg"
            >
              Passer la commande
            </button>
          </div>
        )}
      </div>
    </div>
    </FocusTrap>
  );
}

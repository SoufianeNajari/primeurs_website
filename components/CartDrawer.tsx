'use client'

import { useCart, CartItem, cartKey } from './CartContext';
import CartItemNote from './CartItemNote';
import { X, ShoppingBag, Minus, Plus, Trash2, RotateCcw, Loader2, Sparkles, Tag, Check, Info } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FocusTrap } from 'focus-trap-react';
import { triggerHaptic } from '@/lib/haptic';
import { supabase } from '@/lib/supabase';
import type { ProduitOption } from '@/lib/produit';
import { formatPrixMontant, cartHasPoidsIncertain, isPoidsIncertain } from '@/lib/produit';
import { calcFourchette, formatFourchette } from '@/lib/fourchette';
import { useFourchetteBornes } from '@/lib/use-fourchette';
import { useLivraisonConfig } from '@/lib/use-livraison-config';
import { computeFraisLivraisonCents } from '@/lib/livraison';
import FreeShippingBar from './FreeShippingBar';
import { formatEuros } from '@/lib/format';
import type { UpsellSuggestion } from '@/app/api/upsell/route';

export default function CartDrawer() {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, addToCart, totalItems, totalEstime, restoreCart } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [lastOrder, setLastOrder] = useState<CartItem[] | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [suggestions, setSuggestions] = useState<UpsellSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const cartItems = Object.values(cart);
  const bornes = useFourchetteBornes();
  const config = useLivraisonConfig();
  const hasIncertain = cartHasPoidsIncertain(cartItems);
  const fourchette = totalEstime != null && !hasIncertain ? calcFourchette(totalEstime, bornes) : null;
  const sousTotalCents = !hasIncertain && totalEstime != null ? Math.round(totalEstime * 100) : null;
  // Frais effectifs : si seuil atteint, livraison offerte. En cas de poids
  // incertain, on tombe sur le tarif de base — pas de promesse "offert".
  const fraisCents = computeFraisLivraisonCents(
    sousTotalCents ?? 0,
    config.fraisCents,
    config.seuilGratuitCents,
  );

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

  useEffect(() => {
    if (!isCartOpen || cartItems.length === 0) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    let cancelled = false;
    setSuggestionsLoading(true);
    const cartIds = Array.from(new Set(cartItems.map((i) => i.produitId)));
    fetch('/api/upsell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ excludeIds: cartIds }),
    })
      .then((r) => (r.ok ? r.json() : { suggestions: [] }))
      .then((data: { suggestions?: UpsellSuggestion[] }) => {
        if (cancelled) return;
        // 2 max dans le drawer (compact mobile), 3 sur /order.
        setSuggestions((data.suggestions || []).slice(0, 2));
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setSuggestionsLoading(false);
      });
    return () => { cancelled = true; };
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

  const handleAddSuggestion = (s: UpsellSuggestion) => {
    triggerHaptic();
    addToCart({
      produitId: s.id,
      optionId: s.option.id,
      nom: s.nom,
      categorie: s.categorie,
      libelle: s.option.libelle,
      prix: s.option.prix,
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
                            <span className="text-neutral-500 font-normal italic"> · Prix à la pesée</span>
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
                    <div className="flex items-center justify-between border border-neutral-300 p-1 w-40 bg-neutral-50">
                      <button
                        onClick={() => { triggerHaptic(); updateQuantity(key, item.quantite - 1); }}
                        className="w-11 h-11 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"
                        aria-label="Diminuer la quantité"
                      >
                        <Minus size={16} strokeWidth={1.5} />
                      </button>
                      <span className="font-medium text-neutral-800 text-sm w-10 text-center">{item.quantite}</span>
                      <button
                        onClick={() => { triggerHaptic(); updateQuantity(key, item.quantite + 1); }}
                        className="w-11 h-11 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"
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

          {cartItems.length > 0 && suggestionsLoading && suggestions.length === 0 && (
            <div className="mt-8 pt-6 border-t border-neutral-200">
              <h3 className="text-[11px] uppercase tracking-widest font-medium text-neutral-500 mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-green-primary" strokeWidth={1.5} />
                S&apos;accorde parfaitement avec
              </h3>
              <ul className="space-y-4" aria-busy="true" aria-label="Chargement des suggestions">
                {Array.from({ length: 2 }).map((_, i) => (
                  <li key={i} className="flex items-center justify-between bg-neutral-50 border border-neutral-200 p-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-2/3 bg-neutral-200 animate-pulse" />
                      <div className="h-2.5 w-1/3 bg-neutral-100 animate-pulse" />
                    </div>
                    <div className="w-10 h-10 bg-neutral-100 animate-pulse ml-3" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cartItems.length > 0 && suggestions.length > 0 && (
            <div className="mt-8 pt-6 border-t border-neutral-200">
              <h3 className="text-[11px] uppercase tracking-widest font-medium text-neutral-500 mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-green-primary" strokeWidth={1.5} />
                Coups de cœur du primeur
              </h3>
              <ul className="space-y-3">
                {suggestions.map((s) => {
                  const inCart = !!cart[cartKey(s.id, s.option.id)];
                  return (
                    <li key={s.id} className="flex items-center gap-3 bg-neutral-50 border border-neutral-200 p-3">
                      <div className="min-w-0 flex-1">
                        <span className="font-serif text-neutral-800 block leading-snug truncate">{s.nom}</span>
                        <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium">{s.categorie}</span>
                        <span className="block text-xs text-green-dark mt-0.5">
                          {s.option.prix != null
                            ? `${s.option.prix.toFixed(2).replace('.', ',')} € · ${s.option.libelle}`
                            : `${s.option.libelle} · à la pesée`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => !inCart && handleAddSuggestion(s)}
                        disabled={inCart}
                        className={`shrink-0 w-10 h-10 inline-flex items-center justify-center border transition-colors ${
                          inCart
                            ? 'border-green-primary text-green-primary bg-green-soft/30 cursor-default'
                            : 'border-green-primary text-green-primary hover:bg-green-primary hover:text-white'
                        }`}
                        aria-label={inCart ? `${s.nom} déjà dans le panier` : `Ajouter ${s.nom}`}
                      >
                        {inCart ? <Check size={18} strokeWidth={2} /> : <Plus size={16} strokeWidth={1.5} />}
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
            <FreeShippingBar
              sousTotalCents={sousTotalCents}
              minCents={config.minCents}
              fraisCents={config.fraisCents}
              seuilGratuitCents={config.seuilGratuitCents}
            />
            {hasIncertain ? (
              <div className="flex gap-3 items-start text-xs text-neutral-600 bg-white border border-neutral-200 p-3">
                <Info size={16} strokeWidth={1.5} className="text-green-primary shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Votre panier contient des produits dont le poids sera pesé à la préparation.
                  Le prix final vous sera communiqué à la livraison. Paiement à la livraison.
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
                <div className="flex items-baseline justify-between">
                  <span className={`text-xs uppercase tracking-widest font-medium ${fraisCents === 0 ? 'text-green-dark' : 'text-neutral-500'}`}>Frais de livraison</span>
                  <span className={`text-base font-serif ${fraisCents === 0 ? 'text-green-dark italic' : 'text-neutral-700'}`}>
                    {fraisCents === 0 ? 'Offerts' : formatEuros(fraisCents)}
                  </span>
                </div>
                {fourchette && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-widest text-neutral-500 font-medium">Total final</span>
                    <span className="text-xl font-serif text-neutral-800">{formatFourchette(fourchette)}</span>
                  </div>
                )}
                {fourchette && (
                  <div className="flex gap-2 items-start text-[11px] text-neutral-500 leading-relaxed">
                    <Info size={13} strokeWidth={1.5} className="shrink-0 mt-0.5 text-neutral-400" />
                    <span>Prix indicatif, ajusté à la pesée (cours du jour, poids réel). Paiement à la livraison.</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                  <Tag size={12} strokeWidth={1.5} className="shrink-0" />
                  <span>Code promo à saisir à l&apos;étape suivante.</span>
                </div>
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
            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="block w-full text-center text-[11px] uppercase tracking-widest font-medium text-neutral-500 hover:text-green-primary transition-colors"
            >
              Continuer mes achats
            </button>
          </div>
        )}
      </div>
    </div>
    </FocusTrap>
  );
}

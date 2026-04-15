'use client'

import { useCart, CartItem } from './CartContext';
import { X, ShoppingBag, Minus, Plus, Trash2, RotateCcw, Loader2, Sparkles } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { triggerHaptic } from '@/lib/haptic';
import { supabase } from '@/lib/supabase';

type Product = {
  id: string;
  nom: string;
  categorie: string;
  disponible: boolean;
};

export default function CartDrawer() {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, addToCart, totalItems, restoreCart } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [lastOrder, setLastOrder] = useState<CartItem[] | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);

  const cartItems = Object.values(cart);

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
          const cartIds = cartItems.map(item => item.produitId);
          // On récupère quelques produits disponibles qui ne sont pas dans le panier
          const { data } = await supabase
            .from('produits')
            .select('id, nom, categorie, disponible')
            .eq('disponible', true)
            .limit(10);
            
          if (data) {
            const availableSuggestions = data.filter(p => !cartIds.includes(p.id));
            // Mélanger et prendre les 2 premiers
            const shuffled = availableSuggestions.sort(() => 0.5 - Math.random());
            setSuggestions(shuffled.slice(0, 2));
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
  }, [isCartOpen, cartItems.length]); // Dépend de la longueur pour rafraichir occasionnellement

  // Empêcher le scroll du body quand le tiroir est ouvert
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCartOpen]);

  // Fermer le tiroir automatiquement si on change de page
  useEffect(() => {
    setIsCartOpen(false);
  }, [pathname, setIsCartOpen]);

  const handleRestore = async () => {
    if (!lastOrder) return;
    setIsRestoring(true);
    triggerHaptic();
    
    const productIds = lastOrder.map(i => i.produitId);
    
    try {
      const { data: produitsDb } = await supabase
        .from('produits')
        .select('id, disponible')
        .in('id', productIds);
        
      if (produitsDb) {
        const dbMap = new Map(produitsDb.map(p => [p.id, p.disponible]));
        const validItems = lastOrder.filter(item => dbMap.get(item.produitId) === true);
        
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

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Overlay sombre */}
      <div 
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
        onClick={() => setIsCartOpen(false)}
      />
      
      {/* Tiroir */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        
        {/* Header du tiroir */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200 bg-neutral-50">
          <h2 className="text-xl font-serif text-neutral-800 flex items-center gap-3">
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

        {/* Liste des produits */}
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
              {cartItems.map((item) => (
                <li key={item.produitId} className="flex flex-col gap-4 pb-6 border-b border-neutral-100 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-serif text-lg text-neutral-800 block leading-snug">{item.nom}</span>
                      <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium">{item.categorie}</span>
                    </div>
                    <button 
                      onClick={() => { triggerHaptic(); removeFromCart(item.produitId); }}
                      className="text-neutral-300 hover:text-red-text transition-colors p-2 -mr-2 -mt-2"
                      aria-label="Retirer l'article"
                    >
                      <Trash2 size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between border border-neutral-300 p-1 w-32 bg-neutral-50">
                    <button 
                      onClick={() => { triggerHaptic(); updateQuantity(item.produitId, item.quantite - 1); }}
                      className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"
                      aria-label="Diminuer la quantité"
                    >
                      <Minus size={16} strokeWidth={1.5} />
                    </button>
                    <span className="font-medium text-neutral-800 text-sm w-8 text-center">{item.quantite}</span>
                    <button 
                      onClick={() => { triggerHaptic(); updateQuantity(item.produitId, item.quantite + 1); }}
                      className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"
                      aria-label="Augmenter la quantité"
                    >
                      <Plus size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {cartItems.length > 0 && suggestions.length > 0 && (
            <div className="mt-8 pt-6 border-t border-neutral-200">
              <h3 className="text-[11px] uppercase tracking-widest font-medium text-neutral-500 mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-green-primary" strokeWidth={1.5} />
                S&apos;accorde parfaitement avec
              </h3>
              <ul className="space-y-4">
                {suggestions.map((suggest) => (
                  <li key={suggest.id} className="flex items-center justify-between bg-neutral-50 border border-neutral-200 p-3">
                    <div>
                      <span className="font-serif text-neutral-800 block leading-snug">{suggest.nom}</span>
                      <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium">{suggest.categorie}</span>
                    </div>
                    <button
                      onClick={() => { triggerHaptic(); addToCart(suggest.id, suggest.nom, suggest.categorie, 1); }}
                      className="text-green-primary hover:text-white hover:bg-green-primary border border-green-primary w-8 h-8 flex items-center justify-center transition-colors focus:outline-none"
                      aria-label="Ajouter au panier"
                    >
                      <Plus size={16} strokeWidth={1.5} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer du tiroir */}
        {cartItems.length > 0 && (
          <div className="border-t border-neutral-200 p-6 bg-neutral-50">
            <button
              onClick={() => {
                setIsCartOpen(false);
                router.push('/order');
              }}
              className="w-full bg-green-primary text-white py-4 font-serif text-lg hover:bg-green-dark transition-colors border border-green-primary flex justify-center items-center gap-3 shadow-lg"
            >
              Passer la commande
            </button>
            <p className="text-center text-xs text-neutral-500 mt-4 uppercase tracking-widest">
              Règlement en boutique
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

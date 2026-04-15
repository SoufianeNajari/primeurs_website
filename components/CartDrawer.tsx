'use client'

import { useCart } from './CartContext';
import { X, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function CartDrawer() {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, totalItems } = useCart();
  const router = useRouter();
  const pathname = usePathname();

  const cartItems = Object.values(cart);

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
              <button 
                onClick={() => setIsCartOpen(false)}
                className="text-sm font-medium uppercase tracking-widest text-green-primary hover:text-green-dark border-b border-green-primary pb-1"
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
                      onClick={() => removeFromCart(item.produitId)}
                      className="text-neutral-300 hover:text-red-text transition-colors p-2 -mr-2 -mt-2"
                      aria-label="Retirer l'article"
                    >
                      <Trash2 size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between border border-neutral-300 p-1 w-32 bg-neutral-50">
                    <button 
                      onClick={() => updateQuantity(item.produitId, item.quantite - 1)}
                      className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"
                      aria-label="Diminuer la quantité"
                    >
                      <Minus size={16} strokeWidth={1.5} />
                    </button>
                    <span className="font-medium text-neutral-800 text-sm w-8 text-center">{item.quantite}</span>
                    <button 
                      onClick={() => updateQuantity(item.produitId, item.quantite + 1)}
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

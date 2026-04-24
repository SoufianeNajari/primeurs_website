'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import CartDrawer from './CartDrawer';

export type CartItem = {
  produitId: string;
  nom: string;
  quantite: number;
  categorie: string;
  prix_kg?: number | null;
  unite?: string | null;
};

type CartContextType = {
  cart: Record<string, CartItem>;
  addToCart: (produitId: string, nom: string, categorie: string, quantite?: number, extra?: { prix_kg?: number | null; unite?: string | null }) => void;
  removeFromCart: (produitId: string) => void;
  updateQuantity: (produitId: string, quantite: number) => void;
  clearCart: () => void;
  restoreCart: (items: CartItem[]) => void;
  totalItems: number;
  totalEstime: number | null;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Charger le panier depuis localStorage au démarrage
  useEffect(() => {
    const loadCart = async () => {
      const saved = localStorage.getItem('primeur_cart');
      if (saved) {
        try {
          const parsedCart = JSON.parse(saved) as Record<string, CartItem>;
          const productIds = Object.keys(parsedCart);
          
          if (productIds.length > 0) {
            // Vérifier la disponibilité + rafraîchir prix/unité (auto-upgrade des anciens items localStorage)
            const { data: produitsDb, error } = await supabase
              .from('produits')
              .select('id, disponible, prix_kg, unite')
              .in('id', productIds);

            if (!error && produitsDb) {
              const validCart: Record<string, CartItem> = {};
              const dbMap = new Map(produitsDb.map(p => [p.id, p]));

              for (const id of productIds) {
                const dbProduct = dbMap.get(id);
                if (dbProduct?.disponible === true) {
                  validCart[id] = {
                    ...parsedCart[id],
                    prix_kg: dbProduct.prix_kg,
                    unite: dbProduct.unite,
                  };
                } else if (dbProduct) {
                  console.log(`Le produit ${parsedCart[id].nom} a été retiré car il n'est plus disponible.`);
                }
              }

              setCart(validCart);
              localStorage.setItem('primeur_cart', JSON.stringify(validCart));
            } else {
              setCart(parsedCart);
            }
          }
        } catch (e) {
          console.error('Erreur lors de la lecture du panier:', e);
        }
      }
      setIsLoaded(true);
    };

    loadCart();
  }, []);

  // Sauvegarder le panier à chaque modification
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('primeur_cart', JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  // Écouter les changements Supabase pour retirer les produits devenus indisponibles
  useEffect(() => {
    if (!isLoaded) return;

    const channel = supabase
      .channel('produits_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'produits',
        },
        (payload) => {
          const { id, disponible, nom } = payload.new as { id: string; disponible: boolean; nom: string };
          if (disponible === false) {
            setCart(prev => {
              if (prev[id]) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [id]: _, ...rest } = prev;
                // Optional: You could add a toast here if you had a global toast system.
                console.log(`Le produit ${nom} a été retiré du panier car il n'est plus disponible.`);
                return rest;
              }
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoaded]);

  const addToCart = React.useCallback((produitId: string, nom: string, categorie: string, quantite: number = 1, extra?: { prix_kg?: number | null; unite?: string | null }) => {
    setCart(prev => {
      const existing = prev[produitId];
      return {
        ...prev,
        [produitId]: {
          produitId,
          nom,
          categorie,
          quantite: existing ? existing.quantite + quantite : quantite,
          prix_kg: extra?.prix_kg ?? existing?.prix_kg ?? null,
          unite: extra?.unite ?? existing?.unite ?? null,
        }
      };
    });
    setIsCartOpen(true); // Ouvre le panier lors d'un ajout
  }, []);

  const updateQuantity = React.useCallback((produitId: string, quantite: number) => {
    setCart(prev => {
      if (quantite <= 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [produitId]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [produitId]: { ...prev[produitId], quantite }
      };
    });
  }, []);

  const removeFromCart = React.useCallback((produitId: string) => {
    setCart(prev => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [produitId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearCart = React.useCallback(() => setCart({}), []);

  const restoreCart = React.useCallback((items: CartItem[]) => {
    const newCart: Record<string, CartItem> = {};
    items.forEach(item => {
      newCart[item.produitId] = item;
    });
    setCart(newCart);
  }, []);

  const totalItems = Object.values(cart).reduce((sum, item) => sum + item.quantite, 0);
  const totalEstime = (() => {
    let total = 0;
    let hasPrix = false;
    for (const item of Object.values(cart)) {
      if (item.prix_kg != null) {
        total += Number(item.prix_kg) * item.quantite;
        hasPrix = true;
      }
    }
    return hasPrix ? total : null;
  })();

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, restoreCart, totalItems, totalEstime, isCartOpen, setIsCartOpen }}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart doit être utilisé à l\'intérieur de CartProvider');
  }
  return context;
}

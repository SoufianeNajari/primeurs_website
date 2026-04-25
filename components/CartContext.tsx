'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ProduitOption } from '@/lib/produit';
import CartDrawer from './CartDrawer';

export type CartItem = {
  produitId: string;
  optionId: string;
  nom: string;
  categorie: string;
  libelle: string;
  prix?: number | null;
  quantite: number;
};

export function cartKey(produitId: string, optionId: string): string {
  return `${produitId}:${optionId}`;
}

type CartContextType = {
  cart: Record<string, CartItem>;
  addToCart: (args: { produitId: string; optionId: string; nom: string; categorie: string; libelle: string; prix?: number | null; quantite?: number }) => void;
  removeFromCart: (key: string) => void;
  updateQuantity: (key: string, quantite: number) => void;
  clearCart: () => void;
  restoreCart: (items: CartItem[]) => void;
  totalItems: number;
  totalEstime: number | null;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

type DbProduit = { id: string; disponible: boolean; options: ProduitOption[] | null };

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
          // Ignorer les items sans optionId (schéma legacy pré-migration options)
          const items = Object.values(parsedCart).filter((i) => i && i.produitId && i.optionId);
          const productIds = Array.from(new Set(items.map((i) => i.produitId)));

          if (productIds.length > 0) {
            const { data: produitsDb, error } = await supabase
              .from('produits')
              .select('id, disponible, options')
              .in('id', productIds);

            if (!error && produitsDb) {
              const validCart: Record<string, CartItem> = {};
              const dbMap = new Map((produitsDb as DbProduit[]).map((p) => [p.id, p]));

              for (const item of items) {
                const dbProduct = dbMap.get(item.produitId);
                if (dbProduct?.disponible !== true) continue;
                const freshOption = (dbProduct.options || []).find((o) => o.id === item.optionId);
                if (!freshOption) continue; // option supprimée → on retire du panier
                const key = cartKey(item.produitId, item.optionId);
                validCart[key] = {
                  ...item,
                  libelle: freshOption.libelle,
                  prix: freshOption.prix ?? null,
                };
              }

              setCart(validCart);
              localStorage.setItem('primeur_cart', JSON.stringify(validCart));
            } else {
              // Fallback : on garde tel quel (offline)
              const fallback: Record<string, CartItem> = {};
              for (const i of items) fallback[cartKey(i.produitId, i.optionId)] = i;
              setCart(fallback);
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

  // Écouter les changements Supabase pour retirer les lignes devenues invalides
  useEffect(() => {
    if (!isLoaded) return;

    const channel = supabase
      .channel('produits_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'produits' },
        (payload) => {
          const row = payload.new as { id: string; disponible: boolean; options: ProduitOption[] | null };
          setCart((prev) => {
            const next: Record<string, CartItem> = {};
            let changed = false;
            for (const [key, item] of Object.entries(prev)) {
              if (item.produitId !== row.id) {
                next[key] = item;
                continue;
              }
              if (row.disponible === false) {
                changed = true;
                continue;
              }
              const freshOption = (row.options || []).find((o) => o.id === item.optionId);
              if (!freshOption) {
                changed = true;
                continue;
              }
              // Refresh libellé/prix si modifiés en prod
              if (freshOption.libelle !== item.libelle || (freshOption.prix ?? null) !== (item.prix ?? null)) {
                next[key] = { ...item, libelle: freshOption.libelle, prix: freshOption.prix ?? null };
                changed = true;
              } else {
                next[key] = item;
              }
            }
            return changed ? next : prev;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoaded]);

  const addToCart = React.useCallback(
    (args: { produitId: string; optionId: string; nom: string; categorie: string; libelle: string; prix?: number | null; quantite?: number }) => {
      const { produitId, optionId, nom, categorie, libelle, prix, quantite = 1 } = args;
      const key = cartKey(produitId, optionId);
      setCart((prev) => {
        const existing = prev[key];
        return {
          ...prev,
          [key]: {
            produitId,
            optionId,
            nom,
            categorie,
            libelle,
            prix: prix ?? null,
            quantite: existing ? existing.quantite + quantite : quantite,
          },
        };
      });
      setIsCartOpen(true);
    },
    [],
  );

  const updateQuantity = React.useCallback((key: string, quantite: number) => {
    setCart((prev) => {
      if (quantite <= 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      if (!prev[key]) return prev;
      return { ...prev, [key]: { ...prev[key], quantite } };
    });
  }, []);

  const removeFromCart = React.useCallback((key: string) => {
    setCart((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearCart = React.useCallback(() => setCart({}), []);

  const restoreCart = React.useCallback((items: CartItem[]) => {
    const newCart: Record<string, CartItem> = {};
    items.forEach((item) => {
      if (item.produitId && item.optionId) {
        newCart[cartKey(item.produitId, item.optionId)] = item;
      }
    });
    setCart(newCart);
  }, []);

  const totalItems = Object.values(cart).reduce((sum, item) => sum + item.quantite, 0);
  const totalEstime = (() => {
    let total = 0;
    let hasPrix = false;
    for (const item of Object.values(cart)) {
      if (item.prix != null) {
        total += Number(item.prix) * item.quantite;
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

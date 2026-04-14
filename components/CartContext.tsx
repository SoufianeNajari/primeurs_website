'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';

export type CartItem = {
  produitId: string;
  nom: string;
  quantite: number;
  categorie: string;
};

type CartContextType = {
  cart: Record<string, CartItem>;
  addToCart: (produitId: string, nom: string, categorie: string, quantite?: number) => void;
  removeFromCart: (produitId: string) => void;
  updateQuantity: (produitId: string, quantite: number) => void;
  clearCart: () => void;
  totalItems: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger le panier depuis localStorage au démarrage
  useEffect(() => {
    const saved = localStorage.getItem('primeur_cart');
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (e) {
        console.error('Erreur lors de la lecture du panier:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Sauvegarder le panier à chaque modification
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('primeur_cart', JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  const addToCart = React.useCallback((produitId: string, nom: string, categorie: string, quantite: number = 1) => {
    setCart(prev => {
      const existing = prev[produitId];
      return {
        ...prev,
        [produitId]: {
          produitId,
          nom,
          categorie,
          quantite: existing ? existing.quantite + quantite : quantite
        }
      };
    });
  }, []);

  const updateQuantity = React.useCallback((produitId: string, quantite: number) => {
    setCart(prev => {
      if (quantite <= 0) {
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
      const { [produitId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearCart = React.useCallback(() => setCart({}), []);

  const totalItems = Object.values(cart).reduce((sum, item) => sum + item.quantite, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalItems }}>
      {children}
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

'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ProduitOption } from '@/lib/produit';
import CartDrawer from './CartDrawer';
import CartAddedToast from './CartAddedToast';

export type CartItem = {
  produitId: string;
  optionId: string;
  nom: string;
  categorie: string;
  libelle: string;
  prix?: number | null;
  quantite: number;
  commentaire?: string;
};

export const COMMENTAIRE_MAX = 80;

export function sanitizeCommentaire(raw: string | null | undefined): string | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.replace(/\s+/g, ' ').trim().slice(0, COMMENTAIRE_MAX);
  return trimmed === '' ? undefined : trimmed;
}

export function cartKey(produitId: string, optionId: string): string {
  return `${produitId}:${optionId}`;
}

type LastAddedSignal = { nom: string; libelle: string; signal: number };

type CartContextType = {
  cart: Record<string, CartItem>;
  addToCart: (args: { produitId: string; optionId: string; nom: string; categorie: string; libelle: string; prix?: number | null; quantite?: number }) => void;
  removeFromCart: (key: string) => void;
  updateQuantity: (key: string, quantite: number) => void;
  setItemCommentaire: (key: string, commentaire: string | null) => void;
  clearCart: () => void;
  restoreCart: (items: CartItem[]) => void;
  refreshPrices: () => Promise<void>;
  totalItems: number;
  totalEstime: number | null;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  lastAdded: LastAddedSignal | null;
  // true une fois la lecture localStorage + check Supabase terminés.
  // Permet aux pages dépendantes du panier (order) de ne pas rediriger
  // tant que l'hydratation n'est pas faite.
  isLoaded: boolean;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

type DbProduit = { id: string; disponible: boolean; masque_boutique: boolean | null; options: ProduitOption[] | null };

// Fetch la liste fraîche des produits via /api/products (force-dynamic,
// Cache-Control no-store). Bypass le service worker qui mettait en cache
// 5 min les réponses Supabase REST — source du bug "nouveau prix puis ancien"
// observé après une mise à jour côté admin.
async function fetchProduitsFresh(): Promise<DbProduit[] | null> {
  try {
    const res = await fetch('/api/products', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? (data as DbProduit[]) : null;
  } catch {
    return null;
  }
}

function reconcileCartWithProduits(
  cart: Record<string, CartItem>,
  produits: DbProduit[],
): { cart: Record<string, CartItem>; changed: boolean } {
  const dbMap = new Map(produits.map((p) => [p.id, p]));
  const next: Record<string, CartItem> = {};
  let changed = false;
  for (const [key, item] of Object.entries(cart)) {
    const dbProduct = dbMap.get(item.produitId);
    // /api/products renvoie la liste complète : un produit absent = supprimé.
    // On l'enlève du panier au lieu de garder un prix périmé.
    if (!dbProduct) {
      changed = true;
      continue;
    }
    if (dbProduct.disponible !== true || dbProduct.masque_boutique === true) {
      changed = true;
      continue;
    }
    const freshOption = (dbProduct.options || []).find((o) => o.id === item.optionId);
    if (!freshOption) {
      changed = true;
      continue;
    }
    if (freshOption.libelle !== item.libelle || (freshOption.prix ?? null) !== (item.prix ?? null)) {
      next[key] = { ...item, libelle: freshOption.libelle, prix: freshOption.prix ?? null };
      changed = true;
    } else {
      next[key] = item;
    }
  }
  return { cart: next, changed };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<LastAddedSignal | null>(null);
  const addSignalRef = useRef(0);
  // Séquence des fetchs : toute réponse arrivée après une plus récente est
  // ignorée. Évite qu'un loadCart lent (ex: SW cache) écrase un refreshPrices
  // récent côté /order.
  const reconcileSeqRef = useRef(0);

  const applyFreshProduits = React.useCallback((produits: DbProduit[], seq: number) => {
    if (seq < reconcileSeqRef.current) return;
    setCart((prev) => {
      const { cart: next, changed } = reconcileCartWithProduits(prev, produits);
      return changed ? next : prev;
    });
  }, []);

  // Charger le panier depuis localStorage au démarrage, puis resync prix/libellés
  // via /api/products (source unique, no-store, bypass SW).
  useEffect(() => {
    const loadCart = async () => {
      const seq = ++reconcileSeqRef.current;
      const saved = localStorage.getItem('primeur_cart');
      let initialCart: Record<string, CartItem> = {};
      if (saved) {
        try {
          const parsedCart = JSON.parse(saved) as Record<string, CartItem>;
          // Ignorer les items sans optionId (schéma legacy pré-migration options)
          for (const i of Object.values(parsedCart)) {
            if (i && i.produitId && i.optionId) {
              initialCart[cartKey(i.produitId, i.optionId)] = i;
            }
          }
        } catch (e) {
          console.error('Erreur lors de la lecture du panier:', e);
          initialCart = {};
        }
      }

      // Affiche d'abord le panier localStorage (prix peut-être périmé mais
      // évite un flash vide), puis on resync dès que /api/products répond.
      setCart(initialCart);

      if (Object.keys(initialCart).length === 0) {
        setIsLoaded(true);
        return;
      }

      const produits = await fetchProduitsFresh();
      if (produits) applyFreshProduits(produits, seq);
      setIsLoaded(true);
    };

    loadCart();
  }, [applyFreshProduits]);

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
          const row = payload.new as { id: string; disponible: boolean; masque_boutique: boolean | null; options: ProduitOption[] | null };
          setCart((prev) => {
            const next: Record<string, CartItem> = {};
            let changed = false;
            for (const [key, item] of Object.entries(prev)) {
              if (item.produitId !== row.id) {
                next[key] = item;
                continue;
              }
              if (row.disponible === false || row.masque_boutique === true) {
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
      // Signal pour le mini-toast « Ajouté » (au lieu d'ouvrir le drawer
      // automatiquement, qui forçait l'utilisateur à le fermer pour continuer
      // à parcourir).
      addSignalRef.current += 1;
      setLastAdded({ nom, libelle, signal: addSignalRef.current });
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

  const setItemCommentaire = React.useCallback((key: string, commentaire: string | null) => {
    const sanitized = sanitizeCommentaire(commentaire);
    setCart((prev) => {
      const item = prev[key];
      if (!item) return prev;
      if (sanitized === item.commentaire) return prev;
      const next = { ...item };
      if (sanitized === undefined) delete next.commentaire;
      else next.commentaire = sanitized;
      return { ...prev, [key]: next };
    });
  }, []);

  const clearCart = React.useCallback(() => setCart({}), []);

  // Refresh prix depuis le serveur (bypass SW cache via /api/products).
  // À appeler quand le client arrive sur une page sensible aux prix (ex: /order),
  // pour ne pas afficher un prix périmé mis à jour côté admin il y a < 5 min.
  const refreshPrices = React.useCallback(async () => {
    const seq = ++reconcileSeqRef.current;
    const produits = await fetchProduitsFresh();
    if (produits) applyFreshProduits(produits, seq);
  }, [applyFreshProduits]);

  const restoreCart = React.useCallback((items: CartItem[]) => {
    const newCart: Record<string, CartItem> = {};
    items.forEach((item) => {
      if (item.produitId && item.optionId) {
        // Strip commentaire : une ancienne note (« avocats pas trop mûrs »)
        // n'a pas de sens sur la nouvelle commande.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { commentaire: _, ...rest } = item;
        newCart[cartKey(item.produitId, item.optionId)] = rest;
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
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, setItemCommentaire, clearCart, restoreCart, refreshPrices, totalItems, totalEstime, isCartOpen, setIsCartOpen, lastAdded, isLoaded }}>
      {children}
      <CartDrawer />
      <CartAddedToast />
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

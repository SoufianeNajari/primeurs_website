'use client'

import { useCart } from './CartContext';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic';
import type { Product } from '@/lib/produit';

export default function ProductAddButton({ product }: { product: Product }) {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const quantity = cart[product.id]?.quantite ?? 0;

  if (!product.disponible) {
    return (
      <div className="w-full bg-neutral-100 text-neutral-500 py-4 text-center font-medium border border-neutral-200 uppercase tracking-widest text-[11px]">
        Actuellement indisponible
      </div>
    );
  }

  if (quantity > 0) {
    return (
      <div className="flex items-center justify-between border border-neutral-300 p-1">
        <button
          onClick={() => {
            triggerHaptic();
            if (quantity > 1) updateQuantity(product.id, quantity - 1);
            else removeFromCart(product.id);
          }}
          aria-label={`Diminuer la quantité de ${product.nom}`}
          className="w-12 h-12 flex items-center justify-center text-neutral-600 hover:bg-neutral-100"
        >
          <Minus size={18} strokeWidth={1.5} />
        </button>
        <span className="font-medium text-neutral-800">{quantity} dans le panier</span>
        <button
          onClick={() => {
            triggerHaptic();
            updateQuantity(product.id, quantity + 1);
          }}
          aria-label={`Augmenter la quantité de ${product.nom}`}
          className="w-12 h-12 flex items-center justify-center text-neutral-600 hover:bg-neutral-100"
        >
          <Plus size={18} strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        triggerHaptic();
        addToCart(product.id, product.nom, product.categorie, 1, { prix_kg: product.prix_kg, unite: product.unite });
      }}
      className="w-full bg-green-primary text-white py-4 font-medium flex items-center justify-center gap-2 hover:bg-green-dark transition-colors uppercase tracking-widest text-[11px]"
    >
      <ShoppingBag size={16} strokeWidth={2} />
      Ajouter au panier
    </button>
  );
}

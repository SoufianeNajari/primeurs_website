'use client'

import { useCart } from './CartContext';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic';

type Product = {
  id: string;
  nom: string;
  categorie: string;
  disponible: boolean;
};

function getProductTag(nom: string, categorie: string): { label: string; color: string } | null {
  const n = nom.toLowerCase();
  const c = categorie.toLowerCase();
  
  if (n.includes('bio') || n.includes('biologique')) {
    return { label: 'Bio', color: 'bg-green-100 text-green-800 border-green-200' };
  }
  if (n.includes('fraise') || n.includes('melon') || n.includes('cerise') || n.includes('pêche') || n.includes('abricot') || n.includes('tomate')) {
    return { label: 'De saison', color: 'bg-amber-100 text-amber-800 border-amber-200' };
  }
  if (n.includes('pomme') || n.includes('carotte') || n.includes('salade') || n.includes('poireau') || n.includes('miel') || n.includes('oeuf')) {
    return { label: 'Local', color: 'bg-blue-100 text-blue-800 border-blue-200' };
  }
  if (c === 'fromages' || c === 'épicerie') {
    return { label: 'Artisanal', color: 'bg-stone-100 text-stone-800 border-stone-200' };
  }
  return null;
}

export default function ProductCard({ product }: { product: Product }) {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();

  const cartItem = cart[product.id];
  const quantity = cartItem ? cartItem.quantite : 0;
  const tag = getProductTag(product.nom, product.categorie);

  const handleAdd = () => {
    triggerHaptic();
    addToCart(product.id, product.nom, product.categorie);
  };

  const handleIncrease = () => {
    triggerHaptic();
    updateQuantity(product.id, quantity + 1);
  };
  
  const handleDecrease = () => {
    triggerHaptic();
    if (quantity > 1) updateQuantity(product.id, quantity - 1);
    else removeFromCart(product.id);
  };

  return (
    <div className={`bg-white border border-neutral-200 p-6 flex flex-col justify-between h-full transition-colors ${!product.disponible ? 'opacity-50 bg-neutral-50 cursor-not-allowed' : 'hover:border-green-primary'}`}>
      <div>
        <div className="flex justify-between items-start mb-2">
          <div className="text-[10px] uppercase tracking-[0.15em] text-neutral-400 font-medium mt-1">
            {product.categorie}
          </div>
          {tag && (
            <span className={`inline-block border px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold ${tag.color}`}>
              {tag.label}
            </span>
          )}
        </div>
        <h3 className="text-xl font-serif text-neutral-800 mb-4 leading-snug">
          {product.nom}
        </h3>
      </div>
      
      <div className="mt-6">
        {!product.disponible ? (
          <div className="w-full bg-neutral-100 text-neutral-500 py-3 text-center font-medium border border-neutral-200 uppercase tracking-widest text-[10px]">
            Indisponible
          </div>
        ) : quantity > 0 ? (
          <div className="flex items-center justify-between border border-neutral-300 p-1">
            <button 
              onClick={handleDecrease} 
              aria-label={`Diminuer la quantité de ${product.nom}`}
              className="w-10 h-10 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none active:bg-neutral-200"
            >
              <Minus size={16} strokeWidth={1.5} />
            </button>
            <span className="font-medium text-neutral-800 text-sm w-8 text-center">{quantity}</span>
            <button 
              onClick={handleIncrease} 
              aria-label={`Augmenter la quantité de ${product.nom}`}
              className="w-10 h-10 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none active:bg-neutral-200"
            >
              <Plus size={16} strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <button 
            onClick={handleAdd} 
            className="w-full bg-transparent text-green-primary border border-green-primary py-3 font-medium flex items-center justify-center gap-2 transition-colors hover:bg-green-primary hover:text-white focus:outline-none active:bg-green-dark uppercase tracking-widest text-[11px]"
          >
            <ShoppingBag size={14} strokeWidth={2} />
            Ajouter au panier
          </button>
        )}
      </div>
    </div>
  );
}

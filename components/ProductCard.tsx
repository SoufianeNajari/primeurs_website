'use client'

import { useCart } from './CartContext';
import { Minus, Plus, ShoppingBag } from 'lucide-react';

type Product = {
  id: string;
  nom: string;
  categorie: string;
  disponible: boolean;
};

export default function ProductCard({ product }: { product: Product }) {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();

  const cartItem = cart[product.id];
  const quantity = cartItem ? cartItem.quantite : 0;

  const handleAdd = () => {
    addToCart(product.id, product.nom, product.categorie);
  };

  const handleIncrease = () => updateQuantity(product.id, quantity + 1);
  const handleDecrease = () => {
    if (quantity > 1) updateQuantity(product.id, quantity - 1);
    else removeFromCart(product.id);
  };

  return (
    <div className={`bg-white border border-neutral-200 p-6 flex flex-col justify-between h-full transition-colors ${!product.disponible ? 'opacity-50 bg-neutral-50 cursor-not-allowed' : 'hover:border-green-primary'}`}>
      <div>
        <div className="text-[10px] uppercase tracking-[0.15em] text-neutral-400 mb-2 font-medium">
          {product.categorie}
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
              className="w-10 h-10 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none"
            >
              <Minus size={16} strokeWidth={1.5} />
            </button>
            <span className="font-medium text-neutral-800 text-sm w-8 text-center">{quantity}</span>
            <button 
              onClick={handleIncrease} 
              aria-label={`Augmenter la quantité de ${product.nom}`}
              className="w-10 h-10 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none"
            >
              <Plus size={16} strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <button 
            onClick={handleAdd} 
            className="w-full bg-transparent text-green-primary border border-green-primary py-3 font-medium flex items-center justify-center gap-2 transition-colors hover:bg-green-primary hover:text-white focus:outline-none uppercase tracking-widest text-[11px]"
          >
            <ShoppingBag size={14} strokeWidth={2} />
            Ajouter au panier
          </button>
        )}
      </div>
    </div>
  );
}

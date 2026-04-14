'use client'

import { useCart } from './CartContext';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { useState } from 'react';

type Product = {
  id: string;
  nom: string;
  categorie: string;
  disponible: boolean;
};

export default function ProductCard({ product }: { product: Product }) {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const [isAnimating, setIsAnimating] = useState(false);

  const cartItem = cart[product.id];
  const quantity = cartItem ? cartItem.quantite : 0;

  const handleAdd = () => {
    setIsAnimating(true);
    addToCart(product.id, product.nom, product.categorie);
    setTimeout(() => setIsAnimating(false), 200);
  };

  const handleIncrease = () => updateQuantity(product.id, quantity + 1);
  const handleDecrease = () => {
    if (quantity > 1) updateQuantity(product.id, quantity - 1);
    else removeFromCart(product.id);
  };

  return (
    <div className={`bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-neutral-100 p-4 flex flex-col justify-between h-full transition-all duration-300 ${!product.disponible ? 'opacity-40 grayscale bg-neutral-50 cursor-not-allowed' : 'hover:shadow-md'}`}>
      <div>
        <div className="inline-flex items-center rounded-full bg-green-light px-2.5 py-0.5 text-xs font-semibold text-green-dark mb-3">
          {product.categorie}
        </div>
        <h3 className="text-[18px] font-bold text-neutral-700 mb-3 leading-tight tracking-tight">
          {product.nom}
        </h3>
      </div>
      
      <div className="mt-4">
        {!product.disponible ? (
          <button disabled className="w-full bg-neutral-100 text-neutral-400 py-3 rounded-lg font-medium text-sm cursor-not-allowed border border-neutral-200">
            Indisponible
          </button>
        ) : quantity > 0 ? (
          <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-lg p-1.5">
            <button 
              onClick={handleDecrease} 
              aria-label={`Diminuer la quantité de ${product.nom}`}
              className="w-9 h-9 flex items-center justify-center text-neutral-700 hover:bg-neutral-200 rounded-full transition-colors active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-primary"
            >
              <Minus size={18} />
            </button>
            <span className="font-bold text-neutral-700 text-lg w-8 text-center">{quantity}</span>
            <button 
              onClick={handleIncrease} 
              aria-label={`Augmenter la quantité de ${product.nom}`}
              className="w-9 h-9 flex items-center justify-center text-green-dark bg-green-light hover:bg-[#d1ebe1] rounded-full transition-colors active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-primary"
            >
              <Plus size={18} />
            </button>
          </div>
        ) : (
          <button 
            onClick={handleAdd} 
            className={`w-full bg-green-primary text-white py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all hover:bg-green-dark hover:-translate-y-[1px] active:translate-y-px focus:outline-none focus:ring-2 focus:ring-green-primary focus:ring-offset-2 shadow-sm ${isAnimating ? 'scale-95 bg-green-dark' : ''}`}
          >
            <ShoppingCart size={18} />
            Ajouter
          </button>
        )}
      </div>
    </div>
  );
}

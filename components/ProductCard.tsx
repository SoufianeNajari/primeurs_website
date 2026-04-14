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
    <div className={`bg-white rounded-xl shadow-sm border p-4 flex flex-col justify-between h-full transition-all ${!product.disponible ? 'opacity-60 grayscale bg-gray-50' : 'border-gray-100 hover:shadow-md'}`}>
      <div>
        <div className="text-xs font-semibold text-[#1D9E75] mb-1">{product.categorie}</div>
        <h3 className="text-lg font-bold text-gray-800 mb-3 leading-tight">{product.nom}</h3>
      </div>
      
      <div className="mt-4">
        {!product.disponible ? (
          <button disabled className="w-full bg-gray-200 text-gray-500 py-2.5 rounded-lg font-medium text-sm cursor-not-allowed">
            Indisponible
          </button>
        ) : quantity > 0 ? (
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-1">
            <button onClick={handleDecrease} className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-md transition-colors active:scale-95">
              <Minus size={18} />
            </button>
            <span className="font-bold text-gray-900 text-lg w-8 text-center">{quantity}</span>
            <button onClick={handleIncrease} className="w-9 h-9 flex items-center justify-center text-[#1D9E75] bg-[#e8f5f0] hover:bg-[#d1ebe1] rounded-md transition-colors active:scale-95">
              <Plus size={18} />
            </button>
          </div>
        ) : (
          <button 
            onClick={handleAdd} 
            className={`w-full bg-[#1D9E75] text-white py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all hover:bg-[#15805e] active:scale-95 ${isAnimating ? 'scale-95 bg-[#15805e]' : ''}`}
          >
            <ShoppingCart size={18} />
            Ajouter au panier
          </button>
        )}
      </div>
    </div>
  );
}

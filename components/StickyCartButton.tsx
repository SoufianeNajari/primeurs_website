'use client'

import { ShoppingBag } from 'lucide-react';
import { useCart } from './CartContext';

export default function StickyCartButton() {
  const { totalItems, setIsCartOpen } = useCart();

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 md:left-auto md:right-8 md:bottom-8 z-50 flex justify-center animate-fade-in-up">
      <button
        onClick={() => setIsCartOpen(true)}
        className="w-full md:w-auto min-w-[300px] bg-green-primary text-white py-4 px-6 flex items-center justify-between gap-6 hover:bg-green-dark transition-colors border-t border-green-dark md:border md:shadow-lg focus:outline-none"
      >
        <div className="flex items-center gap-4">
          <ShoppingBag size={20} className="text-white" strokeWidth={1.5} />
          <span className="font-serif text-lg tracking-wide">Voir le panier</span>
        </div>
        <span className="font-medium bg-white text-green-primary px-3 py-1 text-sm rounded-sm">
          {totalItems} article{totalItems > 1 ? 's' : ''}
        </span>
      </button>
    </div>
  );
}

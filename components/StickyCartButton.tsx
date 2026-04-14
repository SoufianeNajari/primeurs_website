'use client'

import { ShoppingBag } from 'lucide-react';
import { useCart } from './CartContext';
import { useRouter } from 'next/navigation';

export default function StickyCartButton() {
  const { totalItems } = useCart();
  const router = useRouter();

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-50 flex justify-center animate-fade-in-up">
      <button 
        onClick={() => router.push('/order')}
        className="w-full md:w-auto min-w-[280px] bg-gray-900 text-white shadow-2xl rounded-full py-4 px-6 flex items-center justify-between gap-6 hover:bg-gray-800 transition-transform active:scale-95 border border-gray-700"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <ShoppingBag size={20} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-wide">Ma commande</span>
        </div>
        <span className="font-bold bg-white text-gray-900 px-3.5 py-1 rounded-full text-sm">
          {totalItems}
        </span>
      </button>
    </div>
  );
}

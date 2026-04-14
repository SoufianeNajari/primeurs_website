'use client'

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useCart } from './CartContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { totalItems } = useCart();

  const isBoutique = pathname === '/boutique';

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
          <span className="text-2xl font-black text-[#1D9E75] tracking-tight">Primeur</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link 
            href="/boutique" 
            className={`font-semibold transition-colors hover:text-[#1D9E75] ${pathname === '/boutique' ? 'text-[#1D9E75]' : 'text-gray-700'}`}
          >
            Notre boutique
          </Link>
          
          {isBoutique && (
            <div className="relative p-2 rounded-full bg-gray-50 text-[#1D9E75]">
              <ShoppingBag size={24} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#ef4444] text-white text-[11px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  {totalItems}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-4">
          {isBoutique && (
            <div className="relative p-2 rounded-full bg-gray-50 text-[#1D9E75]">
              <ShoppingBag size={24} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#ef4444] text-white text-[11px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  {totalItems}
                </span>
              )}
            </div>
          )}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-700 hover:text-[#1D9E75] transition-colors p-1"
            aria-label="Menu principal"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-md py-4 px-4 flex flex-col gap-4 animate-fade-in-up">
          <Link 
            href="/" 
            className={`text-lg font-medium px-4 py-2 rounded-lg ${pathname === '/' ? 'bg-gray-50 text-[#1D9E75]' : 'text-gray-800'}`}
            onClick={() => setIsOpen(false)}
          >
            Accueil
          </Link>
          <Link 
            href="/boutique" 
            className={`text-lg font-medium px-4 py-2 rounded-lg ${pathname === '/boutique' ? 'bg-[#e8f5f0] text-[#1D9E75]' : 'text-gray-800 bg-gray-50'}`}
            onClick={() => setIsOpen(false)}
          >
            Notre boutique
          </Link>
        </div>
      )}
    </nav>
  );
}

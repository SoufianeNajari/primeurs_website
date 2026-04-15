'use client'

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useCart } from './CartContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { totalItems, setIsCartOpen } = useCart();

  const CartIcon = () => (
    <button 
      onClick={() => setIsCartOpen(true)}
      className="relative p-2 text-neutral-800 hover:text-green-primary transition-colors focus:outline-none"
      aria-label="Voir le panier"
    >
      <ShoppingBag size={22} strokeWidth={1.5} />
      {totalItems > 0 && (
        <span 
          className="absolute top-0 right-0 bg-green-primary text-white text-[10px] font-medium h-4 w-4 flex items-center justify-center rounded-full"
        >
          {totalItems}
        </span>
      )}
    </button>
  );

  return (
    <nav className="bg-[#FAF9F7] sticky top-0 z-[60] border-b border-neutral-200">
      <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
          <span className="text-xl md:text-2xl font-serif font-bold text-neutral-800 tracking-wide uppercase">Pontault Primeurs</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link 
            href="/boutique" 
            className={`font-medium tracking-widest uppercase text-[11px] transition-colors hover:text-green-primary ${pathname === '/boutique' ? 'text-green-primary' : 'text-neutral-600'}`}
          >
            Notre boutique
          </Link>
          
          <CartIcon />
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-4">
          <CartIcon />
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="text-neutral-800 hover:text-green-primary transition-colors p-1"
            aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {isOpen ? <X size={28} strokeWidth={1.5} /> : <Menu size={28} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden absolute top-20 left-0 right-0 bg-[#FAF9F7] border-b border-neutral-200 shadow-sm py-4 px-4 flex flex-col gap-2 z-[60]">
          <Link 
            href="/" 
            className={`text-[11px] tracking-widest uppercase font-medium px-4 py-4 border-l-2 ${pathname === '/' ? 'border-green-primary text-green-primary' : 'border-transparent text-neutral-600'}`}
            onClick={() => setIsOpen(false)}
          >
            Accueil
          </Link>
          <Link 
            href="/boutique" 
            className={`text-[11px] tracking-widest uppercase font-medium px-4 py-4 border-l-2 ${pathname === '/boutique' ? 'border-green-primary text-green-primary' : 'border-transparent text-neutral-600'}`}
            onClick={() => setIsOpen(false)}
          >
            Notre boutique
          </Link>
        </div>
      )}
    </nav>
  );
}

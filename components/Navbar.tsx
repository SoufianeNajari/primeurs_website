'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useCart } from './CartContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const pathname = usePathname();
  const { totalItems } = useCart();

  const isBoutique = pathname === '/boutique';

  useEffect(() => {
    if (totalItems > 0) {
      setIsBouncing(true);
      const timer = setTimeout(() => setIsBouncing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [totalItems]);

  const CartIcon = () => (
    <div className="relative p-2 rounded-full bg-green-light text-green-primary">
      <ShoppingBag size={24} />
      {totalItems > 0 && (
        <span 
          className={`absolute -top-1 -right-1 bg-red-text text-white text-[11px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm ${isBouncing ? 'animate-bounce-short' : ''}`}
        >
          {totalItems}
        </span>
      )}
    </div>
  );

  return (
    <nav className="bg-white sticky top-0 z-[60] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
          <span className="text-2xl font-bold text-green-primary tracking-tight">Primeur</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link 
            href="/boutique" 
            className={`font-semibold transition-colors hover:text-green-primary ${pathname === '/boutique' ? 'text-green-primary' : 'text-neutral-700'}`}
          >
            Notre boutique
          </Link>
          
          {isBoutique && <CartIcon />}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-4">
          {isBoutique && <CartIcon />}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="text-neutral-700 hover:text-green-primary transition-colors p-1"
            aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-neutral-100 shadow-md py-4 px-4 flex flex-col gap-4 animate-fade-in-up z-[60]">
          <Link 
            href="/" 
            className={`text-lg font-medium px-4 py-2 rounded-lg ${pathname === '/' ? 'bg-green-light text-green-primary' : 'text-neutral-700'}`}
            onClick={() => setIsOpen(false)}
          >
            Accueil
          </Link>
          <Link 
            href="/boutique" 
            className={`text-lg font-medium px-4 py-2 rounded-lg ${pathname === '/boutique' ? 'bg-green-light text-green-primary' : 'text-neutral-700 bg-neutral-50'}`}
            onClick={() => setIsOpen(false)}
          >
            Notre boutique
          </Link>
        </div>
      )}
    </nav>
  );
}

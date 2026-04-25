'use client'

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, Menu, X, LogOut } from 'lucide-react';
import { useCart } from './CartContext';

export default function Navbar({ isClientAuthed = false }: { isClientAuthed?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems, setIsCartOpen } = useCart();

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/client/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } finally {
      setLoggingOut(false);
      setIsOpen(false);
    }
  }

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
          <Link
            href="/blog"
            className={`font-medium tracking-widest uppercase text-[11px] transition-colors hover:text-green-primary ${pathname?.startsWith('/blog') ? 'text-green-primary' : 'text-neutral-600'}`}
          >
            Recettes
          </Link>
          {isClientAuthed && (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 font-medium tracking-widest uppercase text-[11px] text-neutral-600 hover:text-green-primary transition-colors disabled:opacity-50"
              aria-label="Se déconnecter"
            >
              <LogOut size={14} strokeWidth={1.5} /> Déconnexion
            </button>
          )}

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
          <Link
            href="/blog"
            className={`text-[11px] tracking-widest uppercase font-medium px-4 py-4 border-l-2 ${pathname?.startsWith('/blog') ? 'border-green-primary text-green-primary' : 'border-transparent text-neutral-600'}`}
            onClick={() => setIsOpen(false)}
          >
            Recettes
          </Link>
          {isClientAuthed && (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-left inline-flex items-center gap-2 text-[11px] tracking-widest uppercase font-medium px-4 py-4 border-l-2 border-transparent text-neutral-600 disabled:opacity-50"
            >
              <LogOut size={14} strokeWidth={1.5} /> Déconnexion
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

'use client'

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useCart } from './CartContext';

const VISIBLE_MS = 2200;

export default function CartAddedToast() {
  const { lastAdded, setIsCartOpen, totalItems } = useCart();
  const [visible, setVisible] = useState(false);
  const [snapshot, setSnapshot] = useState<{ nom: string; libelle: string } | null>(null);

  useEffect(() => {
    if (!lastAdded) return;
    setSnapshot({ nom: lastAdded.nom, libelle: lastAdded.libelle });
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, [lastAdded]);

  if (!snapshot) return null;

  // Position calée au-dessus du StickyCartButton (bottom-0 mobile / bottom-8 desktop).
  return (
    <div
      aria-live="polite"
      className={`fixed left-1/2 -translate-x-1/2 z-[60] px-4 w-full max-w-md pointer-events-none transition-all duration-200 ${
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
      style={{
        bottom: totalItems > 0 ? 'calc(72px + env(safe-area-inset-bottom, 0px))' : 'calc(16px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="pointer-events-auto bg-neutral-900 text-white shadow-lg flex items-center gap-3 px-4 py-3">
        <span className="shrink-0 w-7 h-7 rounded-full bg-green-primary flex items-center justify-center">
          <Check size={16} strokeWidth={2.5} />
        </span>
        <div className="flex-1 min-w-0 text-sm">
          <div className="font-medium truncate">Ajouté au panier</div>
          <div className="text-xs text-white/70 truncate">
            {snapshot.nom}
            {snapshot.libelle ? ` · ${snapshot.libelle}` : ''}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            setIsCartOpen(true);
          }}
          className="shrink-0 underline underline-offset-2 text-[11px] uppercase tracking-widest font-semibold hover:text-white/80"
        >
          Voir
        </button>
      </div>
    </div>
  );
}

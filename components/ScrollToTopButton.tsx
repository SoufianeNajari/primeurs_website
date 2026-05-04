'use client'

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const SHOW_THRESHOLD = 600;

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Retour en haut de la page"
      className="fixed z-40 right-4 bottom-24 md:right-8 md:bottom-28 w-11 h-11 bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 shadow-md flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-green-primary/40"
    >
      <ArrowUp size={20} strokeWidth={1.5} />
    </button>
  );
}

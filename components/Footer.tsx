import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-neutral-800 text-neutral-400 py-12 mt-auto border-t border-neutral-800">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-serif text-white mb-2 tracking-wide uppercase">Pontault Primeurs</h2>
          <p className="text-sm font-medium">© 2026 Pontault Primeurs. L&apos;art de la sélection.</p>
        </div>
        
        <div>
          <Link 
            href="/boutique" 
            className="text-white border border-neutral-600 hover:border-white transition-colors font-medium text-[11px] uppercase tracking-widest px-6 py-3 hover:bg-white hover:text-neutral-900"
          >
            Découvrir la sélection
          </Link>
        </div>
      </div>
    </footer>
  );
}

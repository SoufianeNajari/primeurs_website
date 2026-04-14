import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-10 mt-auto">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <h2 className="text-xl font-bold text-white mb-1 tracking-tight">Primeur</h2>
          <p className="text-sm">© 2025 Primeur. Tous droits réservés.</p>
        </div>
        
        <div>
          <Link 
            href="/boutique" 
            className="text-white hover:text-[#1D9E75] transition-colors font-medium text-sm bg-white/10 px-4 py-2 rounded-full hover:bg-white/20"
          >
            Voir la boutique
          </Link>
        </div>
      </div>
    </footer>
  );
}

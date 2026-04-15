import Image from 'next/image';
import Link from 'next/link';

export default function HeroSection() {
  return (
    <div className="relative w-full h-[65vh] min-h-[450px] flex items-center justify-center">
      {/* Background Image */}
      <Image 
        src="/images/hero.jpg" 
        alt="Pontault Primeurs" 
        fill 
        style={{ objectFit: 'cover' }}
        priority
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 z-10"></div>
      
      {/* Content */}
      <div className="relative z-20 text-center px-4 max-w-3xl mx-auto flex flex-col items-center">
        <h1 className="text-5xl md:text-7xl font-serif text-white mb-6 tracking-tight drop-shadow-md">
          Pontault Primeurs
        </h1>
        <p className="text-lg md:text-xl text-white/90 font-light mb-10 drop-shadow-sm max-w-xl">
          Sélection minutieuse de fruits, légumes et fromages affinés. Commandez en ligne et retirez en boutique.
        </p>
        <Link 
          href="/boutique" 
          className="bg-green-primary text-white px-10 py-4 font-medium text-sm uppercase tracking-widest hover:bg-green-dark transition-colors border border-green-primary hover:border-green-dark"
        >
          Découvrir la sélection
        </Link>
      </div>
    </div>
  );
}

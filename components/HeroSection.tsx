import Image from 'next/image';
import Link from 'next/link';

export default function HeroSection() {
  return (
    <div className="relative w-full h-[60vh] min-h-[400px] flex items-center justify-center">
      {/* Background Image */}
      <Image 
        src="/images/hero.jpg" 
        alt="Primeur" 
        fill 
        style={{ objectFit: 'cover' }}
        priority
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.35)] z-10"></div>
      
      {/* Content */}
      <div className="relative z-20 text-center px-4 max-w-3xl mx-auto flex flex-col items-center">
        <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight drop-shadow-lg">
          Primeur
        </h1>
        <p className="text-lg md:text-2xl text-white/90 font-medium mb-8 drop-shadow-md">
          Fruits, légumes et fromages frais — Click & Collect
        </p>
        <Link 
          href="/boutique" 
          className="bg-[#1D9E75] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-[#15805e] hover:scale-105 transition-all shadow-xl active:scale-95"
        >
          Commander maintenant
        </Link>
      </div>
    </div>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import { Truck, Sparkles } from 'lucide-react';

// Blur low-res 12px généré à partir de hero.jpg via sharp. Évite le flash
// blanc/gris pendant le chargement LCP sur mobile 4G.
const HERO_BLUR =
  'data:image/jpeg;base64,/9j/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAIAAwDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAQF/8QAHhAAAgICAgMAAAAAAAAAAAAAAQIAAwQhERJRobH/xAAUAQEAAAAAAAAAAAAAAAAAAAAE/8QAFhEBAQEAAAAAAAAAAAAAAAAAAQAR/9oADAMBAAIRAxEAPwDHx762xmLXIX0W0D08j5J7ame1+FZwDplYL6iINMkgLf/Z';

export default function HeroSection() {
  return (
    <div className="relative w-full h-[70vh] min-h-[480px] flex items-center justify-center">
      {/* Background Image */}
      <Image
        src="/images/hero.jpg"
        alt="Primeur Chez Vous"
        fill
        style={{ objectFit: 'cover' }}
        priority
        sizes="100vw"
        placeholder="blur"
        blurDataURL={HERO_BLUR}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/45 z-10"></div>

      {/* Content */}
      <div className="relative z-20 text-center px-4 max-w-3xl mx-auto flex flex-col items-center">
        <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-1.5 mb-6 text-[10px] uppercase tracking-[0.25em] text-white font-medium">
          <Truck size={14} strokeWidth={1.5} /> Livraison offerte les premiers mois
        </span>
        <h1 className="text-5xl md:text-7xl font-serif text-white mb-6 tracking-tight drop-shadow-md">
          Primeur Chez Vous
        </h1>
        <p className="text-lg md:text-xl text-white/90 font-light mb-4 drop-shadow-sm max-w-xl">
          Fruits, légumes et fromages affinés. Sélection chaque matin à Rungis, livrés chez vous.
        </p>
        <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-white/70 font-medium mb-10">
          <Sparkles size={12} strokeWidth={1.5} /> Sélection quotidienne au marché de Rungis
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/boutique"
            className="bg-green-primary text-white px-10 py-4 font-medium text-sm uppercase tracking-widest hover:bg-green-dark transition-colors border border-green-primary hover:border-green-dark"
          >
            Commander ma livraison
          </Link>
          <Link
            href="/zones-livrees"
            className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-10 py-4 font-medium text-sm uppercase tracking-widest hover:bg-white/20 transition-colors"
          >
            Zones desservies
          </Link>
        </div>
      </div>
    </div>
  );
}

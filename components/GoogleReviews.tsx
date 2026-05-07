import Image from 'next/image';
import { Star, ExternalLink, Store } from 'lucide-react';
import { getCachedGoogleReviews } from '@/lib/google-reviews';
import { SITE } from '@/lib/site';

// Rendu pixel-précis : chaque étoile est remplie au pourcentage exact
// correspondant à la note (ex. 4.8 = 4 pleines + une 5ᵉ remplie à 80%),
// pour éviter qu'une note 4.8 paraisse identique à 4.5.
function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} sur 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fillPct = Math.max(0, Math.min(1, value - i)) * 100;
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} strokeWidth={1.5} className="text-amber-300" />
            {fillPct > 0 && (
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fillPct}%` }}
              >
                <Star size={size} strokeWidth={1.5} className="text-amber-400 fill-amber-400" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default async function GoogleReviews() {
  const data = await getCachedGoogleReviews();
  if (!data || !data.rating || data.reviews.length === 0) return null;

  const topReviews = data.reviews.slice(0, 3);

  return (
    <section className="py-16 md:py-20 bg-white border-t border-neutral-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="inline-flex items-center gap-2 text-green-primary text-xs uppercase tracking-[0.2em] font-medium mb-3">
            <Store size={14} strokeWidth={1.5} /> Notre boutique partenaire
          </div>
          <h2 className="text-3xl md:text-4xl font-serif text-neutral-800 mb-4">
            {SITE.partenaire.name}, primeur depuis {SITE.partenaire.anneeFondation}
          </h2>
          <p className="text-neutral-600 max-w-2xl leading-relaxed mb-6 text-[15px]">
            Primeur Chez Vous est le service de livraison à domicile opéré en partenariat avec{' '}
            <strong className="text-neutral-800">{SITE.partenaire.name}</strong>, primeur de proximité
            installé à Pontault-Combault depuis {new Date().getFullYear() - SITE.partenaire.anneeFondation}{' '}
            ans. C&apos;est leur sélection, leur savoir-faire et leur réseau Rungis que nous livrons chez vous.
          </p>
          <div className="flex items-center gap-3">
            <Stars value={data.rating} size={20} />
            <span className="font-serif text-2xl text-neutral-800">{data.rating.toFixed(1)}</span>
            <span className="text-sm text-neutral-500">· {data.userRatingCount} avis Google</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {topReviews.map((review, idx) => (
            <article
              key={idx}
              className="bg-neutral-50 border border-neutral-200 p-6 flex flex-col"
            >
              <Stars value={review.rating} />
              <p className="text-neutral-700 leading-relaxed mt-4 mb-5 text-[15px] line-clamp-6">
                “{review.text}”
              </p>
              <div className="mt-auto flex items-center gap-3 pt-4 border-t border-neutral-200">
                {review.authorPhoto ? (
                  <Image
                    src={review.authorPhoto}
                    alt={review.authorName}
                    width={36}
                    height={36}
                    className="rounded-full"
                    unoptimized
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 text-sm font-medium">
                    {review.authorName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-neutral-800">{review.authorName}</span>
                  <span className="text-xs text-neutral-500">{review.relativeTime}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="text-center mt-10">
          <a
            href={data.placeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-green-primary transition-colors font-medium uppercase tracking-widest"
          >
            Voir les avis {SITE.partenaire.name} sur Google
            <ExternalLink size={14} strokeWidth={1.5} />
          </a>
          <p className="text-xs text-neutral-400 mt-3 max-w-xl mx-auto">
            Avis collectés sur la fiche Google de notre boutique partenaire.
            Primeur Chez Vous est un service de livraison juridiquement distinct.
          </p>
        </div>
      </div>
    </section>
  );
}

import Image from 'next/image';
import { Star, ExternalLink } from 'lucide-react';
import { getCachedGoogleReviews } from '@/lib/google-reviews';

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < full) return 'full';
    if (i === full && hasHalf) return 'half';
    return 'empty';
  });
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} sur 5`}>
      {stars.map((kind, i) => (
        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
          <Star size={size} strokeWidth={1.5} className="text-amber-300" />
          {kind !== 'empty' && (
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: kind === 'half' ? size / 2 : size }}
            >
              <Star size={size} strokeWidth={1.5} className="text-amber-400 fill-amber-400" />
            </span>
          )}
        </span>
      ))}
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
          <div className="text-green-primary text-xs uppercase tracking-[0.2em] font-medium mb-3">
            Avis clients
          </div>
          <h2 className="text-3xl md:text-4xl font-serif text-neutral-800 mb-5">
            Ce qu&apos;en disent nos clients
          </h2>
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
            Voir tous les avis sur Google
            <ExternalLink size={14} strokeWidth={1.5} />
          </a>
        </div>
      </div>
    </section>
  );
}

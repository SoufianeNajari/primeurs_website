'use client';

import { Lock, Star } from 'lucide-react';

type Props = {
  refreshedAt: string | null;
  rating: number | null;
  userRatingCount: number;
  reviewsCount: number;
};

function formatRelative(iso: string | null): string {
  if (!iso) return 'jamais';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'inconnu';
  const diffMs = Date.now() - then;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours <= 0) return "il y a moins d'une heure";
    return `il y a ${hours} h`;
  }
  if (days === 1) return 'hier';
  if (days < 30) return `il y a ${days} jours`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'il y a 1 mois' : `il y a ${months} mois`;
}

// Bouton de refresh manuel volontairement désactivé pour éviter d'écraser le
// snapshot par inadvertance (les avis cristallisés sont la vitrine de la
// boutique partenaire). Le cron mensuel (cf vercel.json) reste actif.
export default function AdminReviewsWidget({ refreshedAt, rating, userRatingCount, reviewsCount }: Props) {
  return (
    <section className="mb-8 bg-white border border-neutral-200 p-4 md:p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-serif text-neutral-800 flex items-center gap-2">
            <Star size={16} className="text-amber-400 fill-amber-400" strokeWidth={1.5} />
            Avis Google
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            {rating != null ? (
              <>
                <strong className="text-neutral-700">{rating.toFixed(1)}</strong> · {userRatingCount} avis · {reviewsCount} affichés ·
                {' '}MAJ {formatRelative(refreshedAt)}
              </>
            ) : (
              <>Aucun snapshot.</>
            )}
          </p>
        </div>
        <button
          type="button"
          disabled
          title="Refresh manuel verrouillé pour protéger les avis. Le cron mensuel s'en charge."
          className="inline-flex items-center gap-2 bg-neutral-200 text-neutral-500 px-3 py-2 text-[11px] uppercase tracking-widest font-medium cursor-not-allowed"
        >
          <Lock size={14} />
          Verrouillé
        </button>
      </div>
      <p className="mt-3 text-[11px] text-neutral-500 italic">
        Refresh manuel désactivé pour éviter un écrasement involontaire. Mise à jour automatique mensuelle.
      </p>
    </section>
  );
}

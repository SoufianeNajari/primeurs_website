'use client';

import { useState } from 'react';
import { RefreshCw, Star } from 'lucide-react';

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

export default function AdminReviewsWidget(initial: Props) {
  const [refreshedAt, setRefreshedAt] = useState(initial.refreshedAt);
  const [rating, setRating] = useState(initial.rating);
  const [count, setCount] = useState(initial.userRatingCount);
  const [reviewsCount, setReviewsCount] = useState(initial.reviewsCount);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const onRefresh = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/reviews/refresh', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setRefreshedAt(data.refreshedAt ?? new Date().toISOString());
      setRating(data.rating);
      setCount(data.userRatingCount);
      setReviewsCount(data.reviewsCount);
      setMessage({ kind: 'ok', text: `Avis mis à jour (${data.reviewsCount} avis)` });
    } catch (e) {
      setMessage({ kind: 'err', text: e instanceof Error ? e.message : 'Erreur' });
    } finally {
      setLoading(false);
    }
  };

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
                <strong className="text-neutral-700">{rating.toFixed(1)}</strong> · {count} avis · {reviewsCount} affichés ·
                {' '}MAJ {formatRelative(refreshedAt)}
              </>
            ) : (
              <>Aucun snapshot. Cliquez pour récupérer les avis depuis Google.</>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-green-primary text-white px-3 py-2 text-[11px] uppercase tracking-widest font-medium hover:bg-green-dark disabled:bg-neutral-300 disabled:cursor-not-allowed"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Rafraîchissement…' : 'Rafraîchir'}
        </button>
      </div>
      {message && (
        <div
          className={
            'mt-3 text-xs px-3 py-2 border ' +
            (message.kind === 'ok'
              ? 'border-green-300 bg-green-50 text-green-800'
              : 'border-red-300 bg-red-50 text-red-700')
          }
        >
          {message.text}
        </div>
      )}
    </section>
  );
}

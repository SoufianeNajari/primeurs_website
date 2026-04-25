import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-auth';
import { refreshGoogleReviews } from '@/lib/google-reviews';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // Rate limit : 6 refresh / heure / IP (l'API Places coûte de l'argent en prod)
  const ip = getClientIp();
  const rl = rateLimit('reviews-refresh', ip, 6, 60 * 60 * 1000);
  if (!rl.success) {
    const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'Trop de rafraîchissements. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const snapshot = await refreshGoogleReviews();
  if (!snapshot) {
    return NextResponse.json(
      { error: 'Échec de récupération des avis Google. Vérifiez la clé API et le Place ID.' },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    refreshedAt: snapshot.refreshedAt,
    rating: snapshot.rating,
    userRatingCount: snapshot.userRatingCount,
    reviewsCount: snapshot.reviews.length,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { refreshGoogleReviews } from '@/lib/google-reviews';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 500 });
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const snapshot = await refreshGoogleReviews();
  if (!snapshot) {
    console.error('[cron/refresh-reviews] échec refresh');
    return NextResponse.json({ error: 'Échec refresh Google' }, { status: 502 });
  }

  revalidatePath('/');

  console.log('[cron/refresh-reviews] OK', {
    rating: snapshot.rating,
    count: snapshot.reviews.length,
    refreshedAt: snapshot.refreshedAt,
  });

  return NextResponse.json({
    success: true,
    refreshedAt: snapshot.refreshedAt,
    rating: snapshot.rating,
    userRatingCount: snapshot.userRatingCount,
    reviewsCount: snapshot.reviews.length,
  });
}

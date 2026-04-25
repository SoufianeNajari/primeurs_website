import { supabaseAdmin } from '@/lib/supabase';

export type GoogleReview = {
  authorName: string;
  authorPhoto: string | null;
  rating: number;
  relativeTime: string;
  text: string;
  publishTime: string;
  googleMapsUri?: string;
};

export type GoogleReviewsData = {
  rating: number | null;
  userRatingCount: number;
  reviews: GoogleReview[];
  placeUrl: string;
  refreshedAt?: string;
};

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places';
const SNAPSHOT_ID = 'main';

// Appel direct à l'API Google Places. À utiliser uniquement côté admin
// (refresh manuel ou cron) — la lecture publique passe par getCachedGoogleReviews.
export async function fetchGoogleReviewsLive(): Promise<GoogleReviewsData | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) return null;

  const url = `${PLACES_ENDPOINT}/${placeId}?fields=id,displayName,rating,userRatingCount,reviews,googleMapsUri&languageCode=fr`;

  try {
    const res = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'Accept-Language': 'fr',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('[google-reviews] HTTP', res.status, await res.text().catch(() => ''));
      return null;
    }

    const data = await res.json();
    type RawReview = {
      authorAttribution?: { displayName?: string; photoUri?: string };
      rating?: number;
      relativePublishTimeDescription?: string;
      text?: { text?: string };
      originalText?: { text?: string };
      publishTime?: string;
      googleMapsUri?: string;
    };
    const reviews: GoogleReview[] = Array.isArray(data.reviews)
      ? (data.reviews as RawReview[]).map((r) => ({
          authorName: r.authorAttribution?.displayName ?? 'Anonyme',
          authorPhoto: r.authorAttribution?.photoUri ?? null,
          rating: Number(r.rating ?? 0),
          relativeTime: r.relativePublishTimeDescription ?? '',
          text: r.text?.text ?? r.originalText?.text ?? '',
          publishTime: r.publishTime ?? '',
          googleMapsUri: r.googleMapsUri,
        }))
      : [];

    return {
      rating: typeof data.rating === 'number' ? data.rating : null,
      userRatingCount: typeof data.userRatingCount === 'number' ? data.userRatingCount : 0,
      reviews,
      placeUrl: data.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${placeId}`,
    };
  } catch (e) {
    console.error('[google-reviews] fetch failed', e);
    return null;
  }
}

// Lecture du snapshot DB. Source de vérité pour l'affichage public.
export async function getCachedGoogleReviews(): Promise<GoogleReviewsData | null> {
  const { data, error } = await supabaseAdmin
    .from('google_reviews_snapshot')
    .select('rating, user_rating_count, reviews, place_url, refreshed_at')
    .eq('id', SNAPSHOT_ID)
    .maybeSingle();

  if (error) {
    console.error('[google-reviews] read snapshot', error);
    return null;
  }
  if (!data) return null;

  return {
    rating: data.rating == null ? null : Number(data.rating),
    userRatingCount: data.user_rating_count ?? 0,
    reviews: (data.reviews as GoogleReview[]) || [],
    placeUrl: data.place_url || '',
    refreshedAt: data.refreshed_at,
  };
}

// Appel API + UPSERT en DB. Renvoie le snapshot fraîchement écrit.
export async function refreshGoogleReviews(): Promise<GoogleReviewsData | null> {
  const live = await fetchGoogleReviewsLive();
  if (!live) return null;

  const { error } = await supabaseAdmin
    .from('google_reviews_snapshot')
    .upsert({
      id: SNAPSHOT_ID,
      rating: live.rating,
      user_rating_count: live.userRatingCount,
      reviews: live.reviews,
      place_url: live.placeUrl,
      refreshed_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[google-reviews] upsert snapshot', error);
    return null;
  }

  return getCachedGoogleReviews();
}

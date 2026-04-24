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
};

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places';
const REVALIDATE_SECONDS = 60 * 60 * 24; // 24h

export async function getGoogleReviews(): Promise<GoogleReviewsData | null> {
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
      next: { revalidate: REVALIDATE_SECONDS, tags: ['google-reviews'] },
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

// Géocodage adresse → lat/lng via Nominatim (OpenStreetMap, gratuit).
//
// Contraintes Nominatim :
//   - Max 1 req/sec (sleep 1100 ms entre appels)
//   - User-Agent obligatoire identifiant l'application
//   - Référer optionnel mais recommandé
//
// On cache en BDD (commandes.lat/lng) pour ne pas re-géocoder.

import { SITE } from './site';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = `PrimeurChezVous/1.0 (${SITE.url})`;
const RATE_LIMIT_MS = 1100;

let lastCallAt = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const wait = lastCallAt + RATE_LIMIT_MS - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

export type GeocodeResult = { lat: number; lng: number } | null;

export async function geocodeAddress(
  adresse: string,
  codePostal: string,
  ville: string,
): Promise<GeocodeResult> {
  if (!adresse || !ville) return null;
  await rateLimit();

  const q = `${adresse}, ${codePostal} ${ville}, France`;
  const url = `${NOMINATIM_URL}?format=jsonv2&limit=1&countrycodes=fr&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'fr' },
      // Pas de cache Next.js : on a notre propre cache (BDD)
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('[geocode] HTTP error:', res.status, q);
      return null;
    }
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[geocode] no result for:', q);
      return null;
    }
    const { lat, lon } = data[0];
    const latNum = Number(lat);
    const lngNum = Number(lon);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return null;
    return { lat: latNum, lng: lngNum };
  } catch (e) {
    console.error('[geocode] fetch error:', e);
    return null;
  }
}

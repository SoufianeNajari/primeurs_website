// Algorithmes pour optimiser la tournée de livraison.
//
// Nearest-neighbor : heuristique gloutonne, simple et suffisante pour 5-15
// points. Pas optimal mais raisonnable et instantané — pas besoin
// d'algorithme TSP exact pour ces volumes.

export type GeoPoint = { lat: number; lng: number };

// Distance haversine en km (Terre = sphère, R = 6371 km).
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Trie les points par nearest-neighbor depuis `start`. Retourne l'ordre
// optimisé (les points sans coords sont rejetés à la fin dans l'ordre
// d'origine).
export function nearestNeighborOrder<T extends { lat?: number | null; lng?: number | null }>(
  start: GeoPoint,
  points: T[],
): { ordered: T[]; unlocated: T[]; totalKm: number } {
  const located: T[] = [];
  const unlocated: T[] = [];
  for (const p of points) {
    if (p.lat != null && p.lng != null) located.push(p);
    else unlocated.push(p);
  }

  const remaining = [...located];
  const ordered: T[] = [];
  let current: GeoPoint = start;
  let totalKm = 0;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const p = remaining[i];
      const d = haversineKm(current, { lat: p.lat as number, lng: p.lng as number });
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = { lat: next.lat as number, lng: next.lng as number };
    totalKm += bestDist;
  }
  // Ajoute le retour à start
  if (ordered.length > 0) {
    totalKm += haversineKm(current, start);
  }
  return { ordered, unlocated, totalKm };
}

// Construit une URL Google Maps avec waypoints intermédiaires.
// Format : https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...
// Limite Google : 9 waypoints max (10 stops total). Au-delà, on tronque
// avec un avertissement à l'admin.
export function buildGoogleMapsUrl(
  start: GeoPoint,
  stops: { lat: number; lng: number }[],
): string {
  if (stops.length === 0) return '';
  const fmt = (p: GeoPoint) => `${p.lat},${p.lng}`;
  // On revient au point de départ → destination = start
  const waypoints = stops.slice(0, 9).map(fmt).join('|');
  const params = new URLSearchParams({
    api: '1',
    origin: fmt(start),
    destination: fmt(start),
    travelmode: 'driving',
  });
  if (waypoints) params.set('waypoints', waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

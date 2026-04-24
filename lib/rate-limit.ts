import { headers } from 'next/headers';

type Entry = { count: number; resetAt: number };

const buckets: Map<string, Map<string, Entry>> = new Map();

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

export function rateLimit(
  bucketName: string,
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(bucketName);
  if (!bucket) {
    bucket = new Map();
    buckets.set(bucketName, bucket);
  }

  // Nettoyage léger pour ne pas grossir indéfiniment en mémoire
  if (bucket.size > 500) {
    bucket.forEach((v, k) => {
      if (v.resetAt <= now) bucket!.delete(k);
    });
  }

  const entry = bucket.get(key);
  if (!entry || entry.resetAt <= now) {
    bucket.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: max - 1, resetAt: now + windowMs };
  }

  if (entry.count >= max) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { success: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

/**
 * Récupère l'IP client à partir des headers (Vercel, proxys).
 * Retourne 'unknown' si aucune IP trouvée (toujours limité, pas de contournement).
 */
export function getClientIp(): string {
  const h = headers();
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = h.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

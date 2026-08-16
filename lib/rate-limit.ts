import { headers } from 'next/headers';
import { supabaseAdmin } from './supabase';

type Entry = { count: number; resetAt: number };

const buckets: Map<string, Map<string, Entry>> = new Map();

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

// Compteur local au process. Ne suffit PAS à lui seul sur Vercel : plusieurs
// instances de lambda tournent en parallèle et sont recyclées, donc le quota
// réel valait « max × nombre d'instances » et repartait de zéro à chaque cold
// start. Conservé comme première ligne (il attrape les rafales qui tombent sur
// la même instance) et comme filet si la base est injoignable.
function rateLimitMemory(
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
 * Consomme une unité du quota (bucket, clé). Le compteur de référence est en
 * base (RPC atomique `consume_rate_limit`, migration 040), donc partagé par
 * toutes les instances serverless.
 *
 * Les deux compteurs sont consultés et le plus strict l'emporte. Si la base est
 * injoignable, on retombe sur le compteur mémoire plutôt que de bloquer tout le
 * monde : un incident Supabase ne doit pas fermer le login admin.
 */
export async function rateLimit(
  bucketName: string,
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const local = rateLimitMemory(bucketName, key, max, windowMs);

  try {
    const { data, error } = await supabaseAdmin.rpc('consume_rate_limit', {
      p_bucket: bucketName,
      p_key: key,
      p_max: max,
      p_window_ms: windowMs,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return local;

    const shared: RateLimitResult = {
      success: row.allowed === true,
      remaining: Number(row.remaining ?? 0),
      resetAt: new Date(row.reset_at).getTime(),
    };
    if (!shared.success || !local.success) {
      return {
        success: false,
        remaining: 0,
        resetAt: Math.max(shared.resetAt, local.resetAt),
      };
    }
    return {
      success: true,
      remaining: Math.min(shared.remaining, local.remaining),
      resetAt: Math.max(shared.resetAt, local.resetAt),
    };
  } catch (e) {
    console.error('[rate-limit] consume_rate_limit indisponible, repli mémoire:', e);
    return local;
  }
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

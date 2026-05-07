import crypto from 'crypto';

// Signature HMAC-SHA256 d'un lien d'annulation client. Permet d'annuler
// une commande depuis un lien email sans authentification — la validité
// repose uniquement sur la signature et l'expiration.
//
// Format URL : /order/cancel?id=<orderId>&exp=<unixSeconds>&sig=<hex>
//
// Le secret par défaut est SUPABASE_SERVICE_ROLE_KEY (déjà serveur-only,
// jamais exposé au client). On peut surcharger via ORDER_CANCEL_SECRET
// pour pouvoir le rotater indépendamment du service role.

function getSecret(): string {
  const dedicated = process.env.ORDER_CANCEL_SECRET;
  if (dedicated && dedicated.length >= 16) return dedicated;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!fallback) {
    throw new Error('Aucun secret disponible pour signer les liens d\'annulation.');
  }
  return fallback;
}

export type CancelTokenParts = {
  orderId: string;
  exp: number; // unix seconds
};

export function signCancelToken({ orderId, exp }: CancelTokenParts): string {
  const payload = `${orderId}.${exp}`;
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export function verifyCancelToken(orderId: string, exp: number, sig: string): boolean {
  if (!orderId || !sig || !Number.isFinite(exp)) return false;
  if (Math.floor(Date.now() / 1000) > exp) return false;
  const expected = signCancelToken({ orderId, exp });
  // timingSafeEqual exige des Buffers de même longueur
  if (expected.length !== sig.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

// Génère l'URL d'annulation absolue valable jusqu'à `expiresInDays` jours.
export function buildCancelUrl(siteUrl: string, orderId: string, expiresInDays = 7): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
  const sig = signCancelToken({ orderId, exp });
  const params = new URLSearchParams({ id: orderId, exp: String(exp), sig });
  return `${siteUrl.replace(/\/$/, '')}/order/cancel?${params.toString()}`;
}

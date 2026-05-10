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

// Garde-fou : on log une seule fois par process si on retombe sur le service
// role. Ça évite de spammer les logs Vercel à chaque envoi d'email tout en
// rappelant qu'il faut configurer ORDER_CANCEL_SECRET avant la prod (cf
// todo_avant_prod : on ne veut pas signer les liens email avec une clé qui
// ouvre tout Supabase si elle fuit dans des logs ou un export).
let fallbackWarned = false;

function getSecret(): string {
  const dedicated = process.env.ORDER_CANCEL_SECRET;
  if (dedicated && dedicated.length >= 16) return dedicated;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!fallback) {
    throw new Error('Aucun secret disponible pour signer les liens d\'annulation.');
  }
  if (!fallbackWarned) {
    fallbackWarned = true;
    console.warn(
      '[cancel-token] ORDER_CANCEL_SECRET non configuré — fallback sur SUPABASE_SERVICE_ROLE_KEY. ' +
      'À configurer dans les env Vercel avant la prod (≥16 chars, openssl rand -hex 32).',
    );
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

import { supabaseAdmin } from './supabase';
import { formatEuros } from './format';

export type CodePromo = {
  id: string;
  code: string;
  type: 'pourcent' | 'montant_fixe';
  valeur: number;
  reduction_max_cents: number | null;
  min_panier_cents: number;
  usage_max: number | null;
  usage_actuel: number;
  usage_max_par_adresse: number | null;
  expire_at: string | null;
  actif: boolean;
  description: string | null;
  est_parrainage: boolean;
  parrain_email: string | null;
  client_email_lock: string | null;
  created_at: string;
};

// Comparaison d'emails insensible à la casse + anti-alias Gmail :
//  - Gmail/Googlemail ignorent les points dans la partie locale et tout ce
//    qui suit un « + ». Donc john.doe+test@gmail.com ↔ johndoe@gmail.com
//    pointent vers la même boîte. Sans cette normalisation, un fraudeur
//    pouvait créer N « filleuls » avec ses propres alias et accumuler des
//    récompenses MERCI.
export function normalizeEmail(raw: string | null | undefined): string {
  const lower = (raw || '').trim().toLowerCase();
  const atIdx = lower.lastIndexOf('@');
  if (atIdx <= 0) return lower;
  const local = lower.slice(0, atIdx);
  const domain = lower.slice(atIdx + 1);
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const stripped = local.split('+')[0].replace(/\./g, '');
    return `${stripped}@gmail.com`;
  }
  return lower;
}

export type CodePromoValidation =
  | { ok: true; code: CodePromo; reductionCents: number; libelle: string }
  | { ok: false; raison: string };

// Normalise un code utilisateur : trim + uppercase. On accepte donc
// "bienvenue10", " Bienvenue10 ", etc., qui pointent tous vers BIENVENUE10.
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

// Calcule la réduction en cents pour un code donné, sans incrémenter
// l'usage. À appeler depuis l'API de validation et au moment de la
// commande pour recalculer côté serveur (le panier peut avoir changé).
export function computeReduction(code: CodePromo, panierCents: number): number {
  if (panierCents < code.min_panier_cents) return 0;
  let reduction = 0;
  if (code.type === 'pourcent') {
    reduction = Math.round((panierCents * code.valeur) / 100);
  } else if (code.type === 'montant_fixe') {
    reduction = code.valeur;
  }
  if (code.reduction_max_cents != null && reduction > code.reduction_max_cents) {
    reduction = code.reduction_max_cents;
  }
  // Ne jamais réduire plus que le panier.
  if (reduction > panierCents) reduction = panierCents;
  return reduction;
}

// Libellé court pour affichage UX ("-10% offerts (jusqu'à 5,00 €)" ou "-5,00 €")
export function formatCodeLibelle(code: CodePromo): string {
  if (code.type === 'pourcent') {
    const cap = code.reduction_max_cents != null ? ` (jusqu'à ${formatEuros(code.reduction_max_cents)})` : '';
    return `-${code.valeur}%${cap}`;
  }
  return `-${formatEuros(code.valeur)}`;
}

// Charge un code promo depuis la BDD en respectant les conditions d'éligibilité.
// Retourne null si le code n'existe pas, est inactif, expiré, ou plafond atteint.
export async function loadActiveCode(codeRaw: string): Promise<CodePromo | null> {
  const code = normalizeCode(codeRaw);
  if (!code) return null;
  const { data, error } = await supabaseAdmin
    .from('codes_promos')
    .select('*')
    .eq('code', code)
    .maybeSingle();
  if (error || !data) return null;
  const c = data as CodePromo;
  if (!c.actif) return null;
  if (c.expire_at && new Date(c.expire_at) <= new Date()) return null;
  if (c.usage_max != null && c.usage_actuel >= c.usage_max) return null;
  return c;
}

// Compte combien de fois un code donné a déjà été consommé pour une adresse
// BAN donnée. Source de vérité = la table compteur `code_usage_adresse`
// (migration 033), alimentée atomiquement à la consommation (voir
// `tryConsumeAddressUsage`). Sert au pré-check UX dans `validateCodePromo` ;
// l'enforcement réel est atomique côté consommation.
//
// On compte sur le `code_promo` textuel (clé du compteur) plutôt que sur l'id,
// cohérent avec la consommation.
export async function countUsageParAdresse(codeText: string, banId: string): Promise<number> {
  if (!codeText || !banId) return 0;
  const { data, error } = await supabaseAdmin
    .from('code_usage_adresse')
    .select('usage_count')
    .eq('code_promo', codeText)
    .eq('ban_id', banId)
    .maybeSingle();
  if (error) {
    console.error('[codes-promos] countUsageParAdresse:', error);
    return 0;
  }
  return data?.usage_count ?? 0;
}

// Consomme une unité du quota par adresse de façon ATOMIQUE (RPC migration 033).
// Retourne true si la consommation a réussi (sous le plafond), false si le
// plafond est déjà atteint. À appeler AVANT l'application du code dans /api/order
// pour fermer la race entre le pré-check (countUsageParAdresse) et l'insert.
export async function tryConsumeAddressUsage(
  codeText: string,
  banId: string,
  limit: number,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('try_consume_address_usage', {
    p_code: codeText,
    p_ban_id: banId,
    p_limit: limit,
  });
  if (error) {
    console.error('[codes-promos] try_consume_address_usage:', error);
    return false;
  }
  return data === true;
}

// Relâche (décrémente) une réservation par adresse — best-effort. Utilisé si la
// consommation du compteur global échoue juste après, pour ne pas « brûler » un
// usage adresse sur une commande qui n'a finalement pas appliqué le code.
export async function releaseAddressUsage(codeText: string, banId: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc('release_address_usage', {
    p_code: codeText,
    p_ban_id: banId,
  });
  if (error) console.error('[codes-promos] release_address_usage:', error);
}

// Valide un code et calcule la réduction. Aucune mutation BDD.
// Utilisé par /api/codes-promos/validate (avant commande) et par /api/order
// (re-validation atomique au moment de l'enregistrement).
//
// `clientEmail` (optionnel mais recommandé côté serveur) :
//  - permet de rejeter les codes lockés sur un autre email (codes « MERCI »
//    crédités à un parrain particulier)
//  - permet de rejeter le cas où un parrain essaie d'utiliser son propre
//    code de parrainage sur sa propre commande (auto-récompense bloquée)
//
// `banId` (optionnel) : identifiant canonique d'adresse fourni par la BAN
// au moment du checkout. Si renseigné et si le code définit
// `usage_max_par_adresse`, on rejette si ce foyer a déjà épuisé son quota.
export async function validateCodePromo(
  codeRaw: string,
  panierCents: number,
  clientEmail?: string | null,
  banId?: string | null,
): Promise<CodePromoValidation> {
  const code = await loadActiveCode(codeRaw);
  if (!code) {
    return { ok: false, raison: 'Code promo invalide ou expiré.' };
  }
  const emailNorm = normalizeEmail(clientEmail);
  if (code.client_email_lock && (!emailNorm || emailNorm !== normalizeEmail(code.client_email_lock))) {
    return { ok: false, raison: 'Ce code est réservé à un autre client.' };
  }
  if (code.est_parrainage && code.parrain_email && emailNorm && emailNorm === normalizeEmail(code.parrain_email)) {
    return { ok: false, raison: 'Vous ne pouvez pas utiliser votre propre code de parrainage.' };
  }
  if (panierCents < code.min_panier_cents) {
    return {
      ok: false,
      raison: `Panier minimum de ${formatEuros(code.min_panier_cents)} requis pour ce code.`,
    };
  }
  if (code.usage_max_par_adresse != null && banId) {
    const used = await countUsageParAdresse(code.code, banId);
    if (used >= code.usage_max_par_adresse) {
      return { ok: false, raison: 'Ce code a déjà été utilisé pour cette adresse.' };
    }
  }
  const reductionCents = computeReduction(code, panierCents);
  if (reductionCents <= 0) {
    return { ok: false, raison: 'Ce code ne s\'applique pas à votre panier.' };
  }
  return { ok: true, code, reductionCents, libelle: formatCodeLibelle(code) };
}

// Check + increment atomique via RPC Postgres (`try_consume_code_usage` —
// migration 027). Retourne true si l'usage a pu être incrémenté, false sinon.
// À utiliser AVANT l'insert commande pour fermer la race condition entre la
// validation initiale et l'incrément final.
export async function tryConsumeCodeUsage(codeId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('try_consume_code_usage', {
    code_id: codeId,
  });
  if (error) {
    console.error('[codes-promos] Erreur try_consume_code_usage:', error);
    return false;
  }
  return data === true;
}

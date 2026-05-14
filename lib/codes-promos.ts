import { supabaseAdmin } from './supabase';

export type CodePromo = {
  id: string;
  code: string;
  type: 'pourcent' | 'montant_fixe';
  valeur: number;
  reduction_max_cents: number | null;
  min_panier_cents: number;
  usage_max: number | null;
  usage_actuel: number;
  expire_at: string | null;
  actif: boolean;
  description: string | null;
  est_parrainage: boolean;
  parrain_email: string | null;
  client_email_lock: string | null;
  created_at: string;
};

// Comparaison d'emails insensible à la casse — on utilise lowercase comme
// référence canonique (les codes lockés sont stockés en lowercase).
export function normalizeEmail(raw: string | null | undefined): string {
  return (raw || '').trim().toLowerCase();
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
    const cap = code.reduction_max_cents != null
      ? ` (jusqu'à ${(code.reduction_max_cents / 100).toFixed(2).replace('.', ',')} €)`
      : '';
    return `-${code.valeur}%${cap}`;
  }
  return `-${(code.valeur / 100).toFixed(2).replace('.', ',')} €`;
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

// Valide un code et calcule la réduction. Aucune mutation BDD.
// Utilisé par /api/codes-promos/validate (avant commande) et par /api/order
// (re-validation atomique au moment de l'enregistrement).
//
// `clientEmail` (optionnel mais recommandé côté serveur) :
//  - permet de rejeter les codes lockés sur un autre email (codes « MERCI »
//    crédités à un parrain particulier)
//  - permet de rejeter le cas où un parrain essaie d'utiliser son propre
//    code de parrainage sur sa propre commande (auto-récompense bloquée)
export async function validateCodePromo(
  codeRaw: string,
  panierCents: number,
  clientEmail?: string | null,
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
    const min = (code.min_panier_cents / 100).toFixed(2).replace('.', ',');
    return {
      ok: false,
      raison: `Panier minimum de ${min} € requis pour ce code.`,
    };
  }
  const reductionCents = computeReduction(code, panierCents);
  if (reductionCents <= 0) {
    return { ok: false, raison: 'Ce code ne s\'applique pas à votre panier.' };
  }
  return { ok: true, code, reductionCents, libelle: formatCodeLibelle(code) };
}

// Incrémente le compteur d'usage de manière atomique via RPC Postgres
// (`increment_code_usage` — migration 024). L'incrément côté serveur
// évite la race condition d'un read-then-write JS sur les codes
// `usage_max=1` (ex. codes MERCI parrainage).
// Best-effort : on log l'erreur sans faire échouer la commande, car la
// commande elle-même est déjà enregistrée à ce stade.
export async function incrementCodeUsage(codeId: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc('increment_code_usage', {
    code_id: codeId,
  });
  if (error) {
    console.error('[codes-promos] Erreur incrément usage:', error);
  }
}

// Check + increment atomique via RPC Postgres (`try_consume_code_usage` —
// migration 027). Retourne true si l'usage a pu être incrémenté (plafond pas
// atteint, code toujours actif/non expiré), false sinon. À utiliser AVANT
// l'insert commande pour fermer la fenêtre de race condition entre la
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

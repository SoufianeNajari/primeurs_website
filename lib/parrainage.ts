import { supabaseAdmin } from './supabase';
import { normalizeEmail, type CodePromo } from './codes-promos';
import { sendEmail } from './mailer';
import { emailMerciParrain } from './emails/templates';

// Sprint S2.1 — Parrainage croisé.
//
// Modèle : on étend la table codes_promos avec 3 colonnes (cf migration 022)
// plutôt que créer une table dédiée — toute la logique validation/usage
// existe déjà.
//
// Workflow :
//  1. Après chaque commande réussie, on appelle `genererCodeParrainSiNouveau`
//     avec l'email client. Si le client n'a pas encore de code, on en crée un
//     (PARRAIN-XXXX, -5€, illimité, paniers ≥ 30€).
//  2. Le code est inséré dans l'email confirmation pour que le client le
//     partage.
//  3. Quand un autre client utilise ce code à sa commande, on appelle
//     `traiterUsageSiParrainage` qui génère un code-cadeau (MERCI-XXXX,
//     usage_max=1, locké sur l'email du parrain) et envoie un email de
//     remerciement au parrain avec ce code.
//
// Garde-fous (côté validateCodePromo) :
//  - le parrain ne peut pas utiliser son propre code (anti-self-referral)
//  - le code MERCI-XXXX n'est utilisable que par l'email parrain (lock)

const PARRAIN_PREFIX = 'PARRAIN';
const MERCI_PREFIX = 'MERCI';
const REDUCTION_FILLEUL_CENTS = 500;
const REDUCTION_PARRAIN_CENTS = 500;
const PANIER_MIN_CENTS = 3000;

function genShortCode(): string {
  // Codes courts lisibles (sans 0/O/1/I) — 6 caractères, ~10⁹ combinaisons.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

// Crée le code parrain pour ce client, si pas déjà existant. Idempotent :
// rappels successifs sur le même email ne créent pas de doublon.
// Retourne le code (existant ou nouveau) ou null en cas d'erreur.
export async function genererCodeParrainSiNouveau(emailRaw: string): Promise<string | null> {
  const email = normalizeEmail(emailRaw);
  if (!email) return null;

  // Code existant ?
  const { data: existing } = await supabaseAdmin
    .from('codes_promos')
    .select('code')
    .eq('parrain_email', email)
    .eq('est_parrainage', true)
    .is('client_email_lock', null)
    .limit(1)
    .maybeSingle();
  if (existing?.code) return existing.code;

  // Génération avec retry sur collision (très improbable mais zéro coût)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `${PARRAIN_PREFIX}-${genShortCode()}`;
    const { error } = await supabaseAdmin
      .from('codes_promos')
      .insert({
        code,
        type: 'montant_fixe',
        valeur: REDUCTION_FILLEUL_CENTS,
        min_panier_cents: PANIER_MIN_CENTS,
        usage_max: null, // illimité — un parrain peut faire venir plusieurs filleuls
        actif: true,
        est_parrainage: true,
        parrain_email: email,
        description: `Code de parrainage de ${email} — -${REDUCTION_FILLEUL_CENTS / 100}€ pour le filleul`,
      });
    if (!error) return code;
    // 23505 = collision unique sur `code` → on retente avec un autre suffixe
    if ((error as { code?: string }).code !== '23505') {
      console.error('[parrainage] insert code parrain:', error);
      return null;
    }
  }
  console.error('[parrainage] 5 collisions consécutives sur la génération du code');
  return null;
}

// À appeler quand une commande a utilisé un code (codePromoId connu, déjà
// validé). Si ce code est un code de parrainage, on crédite le parrain en
// créant un code « MERCI-XXX » locké sur son email + on lui envoie un email.
export async function traiterUsageSiParrainage(args: {
  codePromoId: string;
  filleulPrenom: string;
  filleulNom: string;
  filleulEmail: string;
}): Promise<void> {
  const { data: code, error } = await supabaseAdmin
    .from('codes_promos')
    .select('id, code, est_parrainage, parrain_email')
    .eq('id', args.codePromoId)
    .maybeSingle();
  if (error || !code || !code.est_parrainage || !code.parrain_email) return;

  const parrainEmail = normalizeEmail(code.parrain_email);
  // Anti auto-récompense : déjà bloqué côté validateCodePromo, mais ceinture
  // + bretelles si un futur appel skipperait la validation.
  if (parrainEmail === normalizeEmail(args.filleulEmail)) return;

  // Génération du code MERCI-XXX
  let codeMerci: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${MERCI_PREFIX}-${genShortCode()}`;
    const { error: insErr } = await supabaseAdmin
      .from('codes_promos')
      .insert({
        code: candidate,
        type: 'montant_fixe',
        valeur: REDUCTION_PARRAIN_CENTS,
        min_panier_cents: PANIER_MIN_CENTS,
        usage_max: 1,
        actif: true,
        client_email_lock: parrainEmail,
        description: `Récompense parrainage — ${parrainEmail} (filleul: ${args.filleulEmail})`,
      });
    if (!insErr) { codeMerci = candidate; break; }
    if ((insErr as { code?: string }).code !== '23505') {
      console.error('[parrainage] insert code MERCI:', insErr);
      return;
    }
  }
  if (!codeMerci) {
    console.error('[parrainage] impossible de générer un code MERCI unique');
    return;
  }

  // Email de remerciement au parrain (best-effort)
  try {
    const html = await emailMerciParrain({
      parrainEmail,
      filleulPrenom: args.filleulPrenom,
      filleulNom: args.filleulNom,
      codeMerci,
      reductionCents: REDUCTION_PARRAIN_CENTS,
      panierMinCents: PANIER_MIN_CENTS,
    });
    await sendEmail({
      to: parrainEmail,
      subject: `Merci ! ${args.filleulPrenom} a utilisé votre code — votre cadeau`,
      html,
    });
  } catch (err) {
    console.error('[parrainage] envoi email merci parrain:', err);
  }
}

// Pour l'email de confirmation client : on récupère son code parrain (s'il
// vient d'être créé ou s'il existe déjà). Renvoie null si rien.
export async function getCodeParrainPourClient(emailRaw: string): Promise<string | null> {
  const email = normalizeEmail(emailRaw);
  if (!email) return null;
  const { data } = await supabaseAdmin
    .from('codes_promos')
    .select('code')
    .eq('parrain_email', email)
    .eq('est_parrainage', true)
    .is('client_email_lock', null)
    .limit(1)
    .maybeSingle();
  return data?.code ?? null;
}

export const PARRAINAGE_CONFIG = {
  reductionFilleulCents: REDUCTION_FILLEUL_CENTS,
  reductionParrainCents: REDUCTION_PARRAIN_CENTS,
  panierMinCents: PANIER_MIN_CENTS,
} as const;

export type { CodePromo };

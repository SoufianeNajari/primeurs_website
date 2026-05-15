import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { type LigneCommande } from '@/lib/emails/templates';
import { sendShopOrderEmail, sendClientOrderEmail, deriveEmailDispatch, persistEmailDispatch } from '@/lib/emails/send-order';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { buildCancelUrl } from '@/lib/cancel-token';
import { getClientSession } from '@/lib/client-auth';
import { isCommandesBloquees } from '@/lib/parametres';
import { getFourchetteBornes } from '@/lib/fourchette';
import { validateCodePromo, tryConsumeCodeUsage } from '@/lib/codes-promos';
import { isValidEmail } from '@/lib/email';
import { currentOriginFromRequest } from '@/lib/site';
import { genererCodeParrainSiNouveau, getCodeParrainPourClient } from '@/lib/parrainage';
import {
  VILLES_AUTORISEES,
  CRENEAUX_LIVRAISON,
  getFraisLivraisonCents,
  getMinCommandeCents,
  getSeuilLivraisonGratuiteCents,
  computeFraisLivraisonCents,
  getCutoffVeilleHeure,
  nextDateForCreneau,
} from '@/lib/livraison';
import type { ProduitOption } from '@/lib/produit';

type PanierItem = {
  produitId: string;
  optionId: string;
  nom: string;
  categorie: string;
  libelle: string;
  prix?: number | null;
  quantite: number;
  commentaire?: string | null;
};

const COMMENTAIRE_MAX = 80;

function sanitizeCommentaireServer(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.replace(/\s+/g, ' ').trim().slice(0, COMMENTAIRE_MAX);
  return trimmed === '' ? undefined : trimmed;
}

function sanitizeText(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\s+/g, ' ').trim().slice(0, max);
}

export async function POST(request: Request) {
  try {
    if (await isCommandesBloquees()) {
      return NextResponse.json(
        { error: 'Les commandes en ligne sont temporairement indisponibles.' },
        { status: 503 },
      );
    }

    // Rate limit : 5 commandes / 10 min / IP
    const ip = getClientIp();
    const rl = rateLimit('order', ip, 5, 10 * 60 * 1000);
    if (!rl.success) {
      const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
      return NextResponse.json(
        { error: 'Trop de commandes. Merci de réessayer plus tard.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }

    const body = await request.json();
    const {
      client,
      panier,
      adresse: adresseRaw,
      complementAdresse: complementRaw,
      ville: villeRaw,
      codePostal: codePostalRaw,
      creneauKey: creneauKeyRaw,
      dateLivraison: dateLivraisonRaw,
      codePromo: codePromoRaw,
      banId: banIdRaw,
      message,
    } = body as {
      client: { prenom: string; nom: string; email: string; telephone: string };
      panier: PanierItem[];
      adresse?: string;
      complementAdresse?: string;
      ville?: string;
      codePostal?: string;
      creneauKey?: string;
      dateLivraison?: string;
      codePromo?: string;
      banId?: string;
      message?: string;
    };

    const banId = typeof banIdRaw === 'string' && banIdRaw.trim()
      ? banIdRaw.trim().slice(0, 80)
      : null;

    if (!client || !client.prenom || !client.nom || !client.email || !client.telephone) {
      return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 });
    }
    const prenomClean = sanitizeText(client.prenom, 80);
    const nomClean = sanitizeText(client.nom, 80);
    const telephoneClean = sanitizeText(client.telephone, 32);
    const emailClean = typeof client.email === 'string' ? client.email.trim() : '';
    if (!prenomClean || !nomClean || !telephoneClean) {
      return NextResponse.json({ error: 'Prénom, nom et téléphone requis.' }, { status: 400 });
    }
    if (!isValidEmail(emailClean)) {
      return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 });
    }
    client.prenom = prenomClean;
    client.nom = nomClean;
    client.email = emailClean;
    client.telephone = telephoneClean;

    const adresse = sanitizeText(adresseRaw, 200);
    const complementAdresse = sanitizeText(complementRaw, 200);
    const ville = sanitizeText(villeRaw, 100);

    if (!adresse) {
      return NextResponse.json({ error: 'Adresse de livraison requise.' }, { status: 400 });
    }
    const villeAutorisee = VILLES_AUTORISEES.find((v) => v.nom === ville);
    if (!villeAutorisee) {
      return NextResponse.json({ error: 'Ville non desservie par la livraison.' }, { status: 400 });
    }
    // On ignore le codePostal du client : on le fixe depuis la whitelist (source de vérité).
    void codePostalRaw;
    const codePostal = villeAutorisee.codePostal;

    const creneau = CRENEAUX_LIVRAISON.find((c) => c.key === creneauKeyRaw);
    if (!creneau) {
      return NextResponse.json({ error: 'Créneau de livraison invalide.' }, { status: 400 });
    }
    if (!dateLivraisonRaw || !/^\d{4}-\d{2}-\d{2}$/.test(dateLivraisonRaw)) {
      return NextResponse.json({ error: 'Date de livraison invalide.' }, { status: 400 });
    }
    // On recalcule la date côté serveur (source de vérité) et on vérifie qu'elle
    // correspond à ce que le client a vu — sinon on prend la prochaine date valide.
    const cutoffHeure = await getCutoffVeilleHeure();
    const dateAttendue = nextDateForCreneau(creneau, cutoffHeure);
    const dateAttendueIso = `${dateAttendue.getFullYear()}-${String(dateAttendue.getMonth() + 1).padStart(2, '0')}-${String(dateAttendue.getDate()).padStart(2, '0')}`;
    if (dateAttendueIso !== dateLivraisonRaw) {
      return NextResponse.json(
        { error: 'Le créneau choisi n\'est plus disponible (cutoff dépassé). Recharge la page.' },
        { status: 400 },
      );
    }

    if (!panier || !Array.isArray(panier) || panier.length === 0) {
      return NextResponse.json({ error: 'Le panier est vide.' }, { status: 400 });
    }

    // Re-vérif disponibilité + lecture fraîche des prix
    const produitIds = panier.map((item) => item.produitId);
    const { data: produitsDb, error: produitsError } = await supabaseAdmin
      .from('produits')
      .select('id, nom, disponible, options')
      .in('id', produitIds);

    if (produitsError) {
      console.error('Erreur lors de la vérification des produits:', produitsError);
      return NextResponse.json({ error: 'Erreur interne lors de la vérification de la disponibilité.' }, { status: 500 });
    }

    type ProduitRow = { id: string; nom: string; disponible: boolean; options: ProduitOption[] | null };
    const produitsDbMap = new Map((produitsDb as ProduitRow[] | null)?.map((p) => [p.id, p]) || []);
    const nomsIndisponibles: string[] = [];

    const lignesNormalisees: LigneCommande[] = panier.map((item) => {
      const db = produitsDbMap.get(item.produitId);
      const option = db?.options?.find((o) => o.id === item.optionId);
      if (!db || !db.disponible || !option) {
        nomsIndisponibles.push(item.nom);
      }
      const commentaire = sanitizeCommentaireServer(item.commentaire);
      const ligne: LigneCommande = {
        produitId: item.produitId,
        optionId: item.optionId,
        nom: item.nom,
        categorie: item.categorie,
        libelle: option?.libelle ?? item.libelle,
        prix: option?.prix ?? null,
        quantite: item.quantite,
      };
      if (commentaire) ligne.commentaire = commentaire;
      return ligne;
    });

    if (nomsIndisponibles.length > 0) {
      return NextResponse.json(
        { error: `Certains produits de votre panier ne sont plus disponibles : ${nomsIndisponibles.join(', ')}. Veuillez les retirer de votre panier.` },
        { status: 400 },
      );
    }

    // Vérification minimum commande (best-effort : on ignore les produits à prix incertain)
    const minCents = await getMinCommandeCents();
    const totalCertainCents = lignesNormalisees.reduce((sum, l) => {
      if (l.prix == null) return sum;
      return sum + Math.round(l.prix * 100) * l.quantite;
    }, 0);
    const tousIncertains = lignesNormalisees.every((l) => l.prix == null);
    if (!tousIncertains && totalCertainCents < minCents) {
      return NextResponse.json(
        { error: `Minimum de commande : ${(minCents / 100).toFixed(2).replace('.', ',')} €.` },
        { status: 400 },
      );
    }

    const [fraisBaseCents, seuilGratuitCents] = await Promise.all([
      getFraisLivraisonCents(),
      getSeuilLivraisonGratuiteCents(),
    ]);
    // Livraison offerte si le sous-total certain atteint le seuil
    // (calcul sur sous-total avant code promo : on récompense le panier brut).
    const fraisCents = computeFraisLivraisonCents(
      totalCertainCents,
      fraisBaseCents,
      seuilGratuitCents,
    );

    let codePromoApplique: string | null = null;
    let reductionCents = 0;
    let codePromoId: string | null = null;
    if (typeof codePromoRaw === 'string' && codePromoRaw.trim() && !tousIncertains) {
      const validation = await validateCodePromo(codePromoRaw, totalCertainCents, client.email, banId);
      if (validation.ok) {
        const consumed = await tryConsumeCodeUsage(validation.code.id);
        if (consumed) {
          codePromoApplique = validation.code.code;
          reductionCents = validation.reductionCents;
          codePromoId = validation.code.id;
        }
      }
    }

    let clientId: string | null = null;
    try {
      const session = await getClientSession();
      clientId = session.clientId ?? null;
    } catch {}

    const { data: orderData, error: dbError } = await supabaseAdmin
      .from('commandes')
      .insert({
        client_nom: `${client.prenom} ${client.nom}`,
        client_email: client.email,
        client_telephone: client.telephone,
        lignes: lignesNormalisees,
        message: message || '',
        statut: 'reçue',
        adresse,
        complement_adresse: complementAdresse || null,
        ville,
        code_postal: codePostal,
        creneau_livraison: creneau.label,
        date_livraison: dateLivraisonRaw,
        frais_livraison_cents: fraisCents,
        code_promo: codePromoApplique,
        reduction_cents: reductionCents,
        ban_id: banId,
        client_id: clientId,
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Erreur Supabase:', dbError);
      return NextResponse.json({ error: "Erreur lors de l'enregistrement de la commande." }, { status: 500 });
    }

    const orderId = orderData.id;

    // Note : le crédit MERCI au parrain est déclenché à la livraison
    // effective (transition statut → 'retirée'), pas ici. Voir
    // /api/orders/[id]. On évite ainsi que des commandes annulées
    // créditent des codes MERCI au passage de commande.
    void codePromoId;

    // Génère (idempotent) le code de parrainage du client pour l'inclure
    // dans son email de confirmation. Best-effort : si la génération échoue,
    // l'email part sans le bloc parrainage plutôt que de bloquer la commande.
    const codeParrainage = await genererCodeParrainSiNouveau(client.email)
      .catch(() => null)
      ?? await getCodeParrainPourClient(client.email).catch(() => null);

    const shopEmailAddr = process.env.SHOP_EMAIL || 'magasin@primeur-test.com';
    const fourchetteBornes = await getFourchetteBornes();
    const emailCtx = {
      orderId,
      prenom: client.prenom,
      nom: client.nom,
      email: client.email,
      telephone: client.telephone,
      message,
      lignes: lignesNormalisees,
      livraisonInfos: {
        adresse,
        complementAdresse: complementAdresse || null,
        ville,
        codePostal,
        creneauLabel: creneau.label,
        dateLivraison: dateLivraisonRaw,
        fraisLivraisonCents: fraisCents,
        codePromo: codePromoApplique,
        reductionCents,
      },
      fourchetteBornes,
      codeParrainage,
    };
    const [shopRes, clientRes] = await Promise.allSettled([
      sendShopOrderEmail(emailCtx, shopEmailAddr),
      sendClientOrderEmail(emailCtx),
    ]);
    const { shopOk, clientOk, errors, update } = deriveEmailDispatch({ shop: shopRes, client: clientRes });
    if (!shopOk || !clientOk) {
      console.error('[order] envoi email partiellement échoué', { orderId, errors });
    }
    persistEmailDispatch(orderId, update).catch(() => {});

    const origin = currentOriginFromRequest(request.headers);
    const cancelUrl = buildCancelUrl(origin, orderId, 7);

    return NextResponse.json({
      success: true,
      commande_id: orderId,
      codePromoApplique,
      reductionCents,
      fraisLivraisonCents: fraisCents,
      emailClientSent: clientOk,
      cancelUrl,
    });
  } catch (error) {
    console.error('Erreur API Order:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur lors de la commande.' }, { status: 500 });
  }
}
